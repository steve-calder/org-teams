import { and, asc, count, eq, ilike, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { organization, team, type LifecycleStatus, type Organization } from '$lib/server/db/schema';
import { writeAdminAudit } from './audit';

export type OrganizationStatusFilter = 'all' | LifecycleStatus;

export interface OrganizationDirectoryInput {
	search?: string;
	status?: OrganizationStatusFilter;
	page?: number;
	pageSize?: number;
}

export interface OrganizationProfileInput {
	name: string;
	description?: string | null;
	status?: LifecycleStatus;
}

export class OrganizationDeactivationBlockedError extends Error {
	constructor(public readonly blockingTeams: { id: string; name: string }[]) {
		super(
			`Deactivate or transfer ${blockingTeams.length} active ${blockingTeams.length === 1 ? 'Team' : 'Teams'} before deactivating this Organization.`
		);
		this.name = 'OrganizationDeactivationBlockedError';
	}
}

export function validateOrganizationProfile(
	input: OrganizationProfileInput
): OrganizationProfileInput {
	const name = input.name.trim();
	if (!name) throw new Error('Organization name is required.');
	if (name.length > 160) throw new Error('Organization name must be 160 characters or fewer.');

	const description = input.description?.trim() || null;
	if (description && description.length > 2000) {
		throw new Error('Organization description must be 2,000 characters or fewer.');
	}

	return {
		name,
		description,
		status: input.status === 'inactive' ? 'inactive' : 'active'
	};
}

export async function listOrganizations(input: OrganizationDirectoryInput = {}) {
	const pageSize = Math.min(Math.max(input.pageSize ?? 25, 1), 100);
	const page = Math.max(input.page ?? 1, 1);
	const conditions: SQL[] = [];
	const search = input.search?.trim();
	if (search) conditions.push(ilike(organization.name, `%${search}%`));
	if (input.status && input.status !== 'all')
		conditions.push(eq(organization.status, input.status));
	const where = conditions.length ? and(...conditions) : undefined;

	const [organizations, totals] = await Promise.all([
		db
			.select({
				organization,
				activeTeamCount: sql<number>`(
					select count(*)::int from ${team}
					where ${team.organizationId} = ${organization.id} and ${team.status} = 'active'
				)`
			})
			.from(organization)
			.where(where)
			.orderBy(asc(organization.name), asc(organization.id))
			.limit(pageSize)
			.offset((page - 1) * pageSize),
		db.select({ value: count() }).from(organization).where(where)
	]);

	return {
		organizations,
		page,
		pageSize,
		total: totals[0]?.value ?? 0,
		search: search ?? '',
		status: input.status ?? 'all'
	};
}

export async function listOrganizationOptions(status?: LifecycleStatus) {
	return db
		.select({ id: organization.id, name: organization.name, status: organization.status })
		.from(organization)
		.where(status ? eq(organization.status, status) : undefined)
		.orderBy(asc(organization.name), asc(organization.id));
}

export async function getOrganizationAdminDetail(organizationId: string) {
	const record = await db.query.organization.findFirst({
		where: eq(organization.id, organizationId)
	});
	if (!record) return undefined;

	const teams = await db
		.select({ id: team.id, name: team.name, type: team.type, status: team.status })
		.from(team)
		.where(eq(team.organizationId, organizationId))
		.orderBy(asc(team.name), asc(team.id));
	return {
		organization: record,
		teams,
		activeTeams: teams.filter((row) => row.status === 'active')
	};
}

export async function createOrganization(
	input: OrganizationProfileInput,
	actorAuthUserId: string
): Promise<Organization> {
	const values = validateOrganizationProfile(input);
	return db.transaction(async (tx) => {
		const [created] = await tx.insert(organization).values(values).returning();
		await writeAdminAudit(tx, {
			actorAuthUserId,
			targetOrganizationId: created.id,
			action: 'organization.created',
			metadata: { fields: 'name,description,status', status: created.status }
		});
		return created;
	});
}

export async function updateOrganization(
	organizationId: string,
	input: OrganizationProfileInput,
	actorAuthUserId: string
): Promise<Organization> {
	const values = validateOrganizationProfile(input);
	return db.transaction(async (tx) => {
		await tx.execute(sql`select id from ${organization} where id = ${organizationId} for update`);
		const [current] = await tx
			.select()
			.from(organization)
			.where(eq(organization.id, organizationId))
			.limit(1);
		if (!current) throw new Error('Organization not found.');

		if (current.status !== 'inactive' && values.status === 'inactive') {
			const blockingTeams = await tx
				.select({ id: team.id, name: team.name })
				.from(team)
				.where(and(eq(team.organizationId, organizationId), eq(team.status, 'active')))
				.orderBy(asc(team.name), asc(team.id));
			if (blockingTeams.length) throw new OrganizationDeactivationBlockedError(blockingTeams);
		}

		const [updated] = await tx
			.update(organization)
			.set(values)
			.where(eq(organization.id, organizationId))
			.returning();
		await writeAdminAudit(tx, {
			actorAuthUserId,
			targetOrganizationId: organizationId,
			action: 'organization.updated',
			metadata: {
				fields: 'name,description,status',
				previousStatus: current.status,
				status: updated.status
			}
		});
		return updated;
	});
}
