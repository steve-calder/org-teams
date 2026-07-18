import { and, asc, count, eq, ilike, or, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	organization,
	team,
	TEAM_TYPES,
	type LifecycleStatus,
	type Team,
	type TeamType
} from '$lib/server/db/schema';
import { writeAdminAudit } from './audit';
import { lockOrganizationStructure } from './team-hierarchy';

export const TEAM_TYPE_OPTIONS: readonly { value: TeamType; label: string }[] = [
	{ value: 'department', label: 'Department' },
	{ value: 'functional', label: 'Functional' },
	{ value: 'product', label: 'Product' },
	{ value: 'delivery', label: 'Delivery' },
	{ value: 'project', label: 'Project' },
	{ value: 'geographic', label: 'Geographic' },
	{ value: 'committee', label: 'Committee' },
	{ value: 'community', label: 'Community' },
	{ value: 'other', label: 'Other' }
];

export function isTeamType(value: string | null | undefined): value is TeamType {
	return Boolean(value && (TEAM_TYPES as readonly string[]).includes(value));
}

export function teamTypeLabel(value: TeamType): string {
	return TEAM_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export type TeamStatusFilter = 'all' | LifecycleStatus;
export type TeamTypeFilter = 'all' | TeamType;

export interface TeamDirectoryInput {
	search?: string;
	organizationId?: string;
	type?: TeamTypeFilter;
	status?: TeamStatusFilter;
	page?: number;
	pageSize?: number;
}

export interface TeamProfileInput {
	name: string;
	purpose?: string | null;
	type: string;
	status?: LifecycleStatus;
}

export interface CreateTeamInput extends TeamProfileInput {
	organizationId: string;
}

export class TeamTransferBlockedError extends Error {
	constructor(public readonly blockingTeams: { id: string; name: string }[]) {
		super("Clear this Team's parent and child relationships before transferring it.");
		this.name = 'TeamTransferBlockedError';
	}
}

export class TeamDeactivationBlockedError extends Error {
	constructor(public readonly blockingTeams: { id: string; name: string }[]) {
		super(
			`Deactivate or reparent ${blockingTeams.length} active descendant ${blockingTeams.length === 1 ? 'Team' : 'Teams'} before deactivating this Team.`
		);
		this.name = 'TeamDeactivationBlockedError';
	}
}

export function validateTeamProfile(input: TeamProfileInput) {
	const name = input.name.trim();
	if (!name) throw new Error('Team name is required.');
	if (name.length > 160) throw new Error('Team name must be 160 characters or fewer.');
	const purpose = input.purpose?.trim() || null;
	if (purpose && purpose.length > 2000) {
		throw new Error('Team purpose must be 2,000 characters or fewer.');
	}
	if (!isTeamType(input.type)) throw new Error('Select a recognized Team type.');
	return {
		name,
		purpose,
		type: input.type,
		status: input.status === 'inactive' ? ('inactive' as const) : ('active' as const)
	};
}

export async function listTeams(input: TeamDirectoryInput = {}) {
	const pageSize = Math.min(Math.max(input.pageSize ?? 25, 1), 100);
	const page = Math.max(input.page ?? 1, 1);
	const conditions: SQL[] = [];
	const search = input.search?.trim();
	if (search)
		conditions.push(or(ilike(team.name, `%${search}%`), ilike(organization.name, `%${search}%`))!);
	if (input.organizationId) conditions.push(eq(team.organizationId, input.organizationId));
	if (input.type && input.type !== 'all') conditions.push(eq(team.type, input.type));
	if (input.status && input.status !== 'all') conditions.push(eq(team.status, input.status));
	const where = conditions.length ? and(...conditions) : undefined;

	const baseSelection = {
		team,
		organization: {
			id: organization.id,
			name: organization.name,
			status: organization.status
		}
	};
	const [teams, totals] = await Promise.all([
		db
			.select(baseSelection)
			.from(team)
			.innerJoin(organization, eq(team.organizationId, organization.id))
			.where(where)
			.orderBy(asc(team.name), asc(team.id))
			.limit(pageSize)
			.offset((page - 1) * pageSize),
		db
			.select({ value: count() })
			.from(team)
			.innerJoin(organization, eq(team.organizationId, organization.id))
			.where(where)
	]);

	return {
		teams,
		page,
		pageSize,
		total: totals[0]?.value ?? 0,
		search: search ?? '',
		organizationId: input.organizationId ?? '',
		type: input.type ?? 'all',
		status: input.status ?? 'all'
	};
}

export async function getTeamAdminDetail(teamId: string) {
	const [record] = await db
		.select({
			team,
			organization: {
				id: organization.id,
				name: organization.name,
				status: organization.status
			}
		})
		.from(team)
		.innerJoin(organization, eq(team.organizationId, organization.id))
		.where(eq(team.id, teamId))
		.limit(1);
	return record;
}

async function lockOrganization(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	organizationId: string
) {
	await lockOrganizationStructure(tx, organizationId);
	const [record] = await tx
		.select()
		.from(organization)
		.where(eq(organization.id, organizationId))
		.limit(1);
	if (!record) throw new Error('Organization not found.');
	return record;
}

export async function createTeam(input: CreateTeamInput, actorAuthUserId: string): Promise<Team> {
	const values = validateTeamProfile(input);
	if (!input.organizationId) throw new Error('Owning Organization is required.');
	return db.transaction(async (tx) => {
		const owner = await lockOrganization(tx, input.organizationId);
		if (values.status === 'active' && owner.status !== 'active') {
			throw new Error('The owning Organization must be active before creating an active Team.');
		}
		const [created] = await tx
			.insert(team)
			.values({ ...values, organizationId: owner.id })
			.returning();
		await writeAdminAudit(tx, {
			actorAuthUserId,
			targetTeamId: created.id,
			action: 'team.created',
			metadata: { fields: 'organizationId,name,purpose,type,status', organizationId: owner.id }
		});
		return created;
	});
}

export async function updateTeam(
	teamId: string,
	input: TeamProfileInput,
	actorAuthUserId: string
): Promise<Team> {
	const values = validateTeamProfile(input);
	return db.transaction(async (tx) => {
		const [initial] = await tx.select().from(team).where(eq(team.id, teamId)).limit(1);
		if (!initial) throw new Error('Team not found.');
		await lockOrganizationStructure(tx, initial.organizationId);
		const [current] = await tx.select().from(team).where(eq(team.id, teamId)).limit(1);
		if (!current) throw new Error('Team not found.');
		if (current.organizationId !== initial.organizationId) {
			throw new Error('Team ownership changed; retry the operation.');
		}
		if (values.status === 'active') {
			const [owner] = await tx
				.select()
				.from(organization)
				.where(eq(organization.id, current.organizationId))
				.limit(1);
			if (!owner) throw new Error('Organization not found.');
			if (owner.status !== 'active') {
				throw new Error('The owning Organization must be active before activating this Team.');
			}
			if (current.parentTeamId) {
				const [parent] = await tx
					.select({ id: team.id, status: team.status })
					.from(team)
					.where(
						and(eq(team.id, current.parentTeamId), eq(team.organizationId, current.organizationId))
					)
					.limit(1);
				if (!parent || parent.status !== 'active') {
					throw new Error('An active Team requires an active parent Team.');
				}
			}
		}
		if (current.status === 'active' && values.status === 'inactive') {
			const hierarchyRows = await tx
				.select({
					id: team.id,
					name: team.name,
					parentTeamId: team.parentTeamId,
					status: team.status
				})
				.from(team)
				.where(eq(team.organizationId, current.organizationId));
			const descendantIds = new Set<string>();
			const pending = [teamId];
			while (pending.length) {
				const parentId = pending.pop()!;
				for (const row of hierarchyRows) {
					if (row.parentTeamId === parentId && !descendantIds.has(row.id)) {
						descendantIds.add(row.id);
						pending.push(row.id);
					}
				}
			}
			const blockingTeams = hierarchyRows
				.filter((row) => descendantIds.has(row.id) && row.status === 'active')
				.map(({ id, name }) => ({ id, name }))
				.sort(
					(left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
				);
			if (blockingTeams.length) throw new TeamDeactivationBlockedError(blockingTeams);
		}
		const [updated] = await tx.update(team).set(values).where(eq(team.id, teamId)).returning();
		await writeAdminAudit(tx, {
			actorAuthUserId,
			targetTeamId: teamId,
			action: 'team.updated',
			metadata: {
				fields: 'name,purpose,type,status',
				organizationId: current.organizationId,
				previousStatus: current.status,
				status: updated.status
			}
		});
		return updated;
	});
}

export async function transferTeam(
	teamId: string,
	destinationOrganizationId: string,
	confirmed: boolean,
	actorAuthUserId: string
): Promise<Team> {
	if (!confirmed) throw new Error('Confirm the Team transfer before continuing.');
	return db.transaction(async (tx) => {
		const [initial] = await tx.select().from(team).where(eq(team.id, teamId)).limit(1);
		if (!initial) throw new Error('Team not found.');
		if (!destinationOrganizationId || destinationOrganizationId === initial.organizationId) {
			throw new Error('Select a different destination Organization.');
		}

		const organizationIds = [initial.organizationId, destinationOrganizationId].sort();
		for (const organizationId of organizationIds) {
			await lockOrganizationStructure(tx, organizationId);
		}
		const [current] = await tx.select().from(team).where(eq(team.id, teamId)).limit(1);
		if (!current || current.organizationId !== initial.organizationId) {
			throw new Error('Team ownership changed; retry the operation.');
		}
		const lockedOrganizations = await tx
			.select()
			.from(organization)
			.where(or(eq(organization.id, organizationIds[0]), eq(organization.id, organizationIds[1])));
		const destination = lockedOrganizations.find((row) => row.id === destinationOrganizationId);
		if (!destination) throw new Error('Destination Organization not found.');
		if (destination.status !== 'active')
			throw new Error('Destination Organization must be active.');

		const hierarchyRows = await tx
			.select({ id: team.id, name: team.name, parentTeamId: team.parentTeamId })
			.from(team)
			.where(eq(team.organizationId, current.organizationId));
		const blockingTeams = hierarchyRows
			.filter((row) => row.id === current.parentTeamId || row.parentTeamId === current.id)
			.map(({ id, name }) => ({ id, name }))
			.sort(
				(left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
			);
		if (blockingTeams.length) throw new TeamTransferBlockedError(blockingTeams);

		const [updated] = await tx
			.update(team)
			.set({ organizationId: destinationOrganizationId })
			.where(eq(team.id, teamId))
			.returning();
		await writeAdminAudit(tx, {
			actorAuthUserId,
			targetTeamId: teamId,
			action: 'team.transferred',
			metadata: {
				sourceOrganizationId: current.organizationId,
				destinationOrganizationId
			}
		});
		return updated;
	});
}
