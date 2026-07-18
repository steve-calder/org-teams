import { and, asc, count, eq, ilike, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { person, team, user, type Person } from '$lib/server/db/schema';
import { writeAdminAudit } from './audit';

export type LoginFilter = 'all' | 'active' | 'disabled' | 'none';
export type AdminFilter = 'all' | 'admin' | 'non-admin';
export type PersonStatusFilter = 'all' | 'active' | 'inactive';

export interface PersonDirectoryInput {
	search?: string;
	login?: LoginFilter;
	admin?: AdminFilter;
	status?: PersonStatusFilter;
	page?: number;
	pageSize?: number;
}

export interface PersonProfileInput {
	displayName: string;
	legalName?: string | null;
	employeeIdentifier?: string | null;
	jobTitle?: string | null;
	status?: 'active' | 'inactive';
}

export class PersonDeactivationBlockedError extends Error {
	constructor(public readonly blockingTeams: { id: string; name: string }[]) {
		super(
			`Clear or reassign ${blockingTeams.length} active ${blockingTeams.length === 1 ? 'Team' : 'Teams'} managed by this Person before deactivating them.`
		);
		this.name = 'PersonDeactivationBlockedError';
	}
}

function adminRoleCondition() {
	return sql<boolean>`(',' || coalesce(${user.role}, '') || ',') like '%,admin,%'`;
}

function directoryConditions(input: PersonDirectoryInput): SQL[] {
	const conditions: SQL[] = [];
	const search = input.search?.trim();
	if (search) {
		conditions.push(
			or(
				ilike(person.displayName, `%${search}%`),
				ilike(person.employeeIdentifier, `%${search}%`),
				ilike(user.email, `%${search}%`)
			)!
		);
	}

	if (input.status && input.status !== 'all') conditions.push(eq(person.status, input.status));
	if (input.login === 'none') conditions.push(isNull(person.authUserId));
	if (input.login === 'active') {
		conditions.push(isNotNull(person.authUserId));
		conditions.push(or(eq(user.banned, false), isNull(user.banned))!);
	}
	if (input.login === 'disabled') conditions.push(eq(user.banned, true));
	if (input.admin === 'admin') conditions.push(adminRoleCondition());
	if (input.admin === 'non-admin') conditions.push(sql`not (${adminRoleCondition()})`);

	return conditions;
}

export async function listPeople(input: PersonDirectoryInput = {}) {
	const pageSize = Math.min(Math.max(input.pageSize ?? 25, 1), 100);
	const page = Math.max(input.page ?? 1, 1);
	const conditions = directoryConditions(input);
	const where = conditions.length ? and(...conditions) : undefined;

	const [rows, totals, orphanTotals] = await Promise.all([
		db
			.select({
				id: person.id,
				displayName: person.displayName,
				legalName: person.legalName,
				employeeIdentifier: person.employeeIdentifier,
				jobTitle: person.jobTitle,
				status: person.status,
				createdAt: person.createdAt,
				updatedAt: person.updatedAt,
				authUserId: user.id,
				authName: user.name,
				authEmail: user.email,
				emailVerified: user.emailVerified,
				role: user.role,
				banned: user.banned,
				banReason: user.banReason,
				banExpires: user.banExpires
			})
			.from(person)
			.leftJoin(user, eq(person.authUserId, user.id))
			.where(where)
			.orderBy(asc(person.displayName), asc(person.id))
			.limit(pageSize)
			.offset((page - 1) * pageSize),
		db
			.select({ value: count() })
			.from(person)
			.leftJoin(user, eq(person.authUserId, user.id))
			.where(where),
		db
			.select({ value: count() })
			.from(user)
			.leftJoin(person, eq(person.authUserId, user.id))
			.where(isNull(person.id))
	]);

	return {
		people: rows.map((row) => ({
			person: {
				id: row.id,
				displayName: row.displayName,
				legalName: row.legalName,
				employeeIdentifier: row.employeeIdentifier,
				jobTitle: row.jobTitle,
				status: row.status,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt
			},
			auth: row.authUserId
				? {
						id: row.authUserId,
						name: row.authName!,
						email: row.authEmail!,
						emailVerified: row.emailVerified!,
						isAdmin:
							row.role
								?.split(',')
								.map((role) => role.trim())
								.includes('admin') ?? false,
						banned: Boolean(row.banned),
						banReason: row.banReason,
						banExpires: row.banExpires
					}
				: null
		})),
		page,
		pageSize,
		total: totals[0]?.value ?? 0,
		orphanedAuthUsers: orphanTotals[0]?.value ?? 0,
		search: input.search?.trim() ?? '',
		login: input.login ?? 'all',
		admin: input.admin ?? 'all',
		status: input.status ?? 'all'
	};
}

export async function getPersonAdminDetail(personId: string) {
	const [row] = await db
		.select({
			person,
			authUserId: user.id,
			authName: user.name,
			authEmail: user.email,
			emailVerified: user.emailVerified,
			role: user.role,
			banned: user.banned,
			banReason: user.banReason,
			banExpires: user.banExpires
		})
		.from(person)
		.leftJoin(user, eq(person.authUserId, user.id))
		.where(eq(person.id, personId))
		.limit(1);

	if (!row) return undefined;
	return {
		person: row.person,
		auth: row.authUserId
			? {
					id: row.authUserId,
					name: row.authName!,
					email: row.authEmail!,
					emailVerified: row.emailVerified!,
					isAdmin:
						row.role
							?.split(',')
							.map((role) => role.trim())
							.includes('admin') ?? false,
					banned: Boolean(row.banned),
					banReason: row.banReason,
					banExpires: row.banExpires
				}
			: null
	};
}

export function validatePersonProfile(input: PersonProfileInput): PersonProfileInput {
	const displayName = input.displayName.trim();
	if (!displayName) throw new Error('Display name is required.');
	if (displayName.length > 160) throw new Error('Display name must be 160 characters or fewer.');

	const optional = (value: string | null | undefined, max: number, label: string) => {
		const normalized = value?.trim() || null;
		if (normalized && normalized.length > max) {
			throw new Error(`${label} must be ${max} characters or fewer.`);
		}
		return normalized;
	};

	return {
		displayName,
		legalName: optional(input.legalName, 200, 'Legal name'),
		employeeIdentifier: optional(input.employeeIdentifier, 100, 'Employee identifier'),
		jobTitle: optional(input.jobTitle, 160, 'Job title'),
		status: input.status === 'inactive' ? 'inactive' : 'active'
	};
}

export async function createPerson(
	input: PersonProfileInput,
	actorAuthUserId: string
): Promise<Person> {
	const values = validatePersonProfile(input);
	return db.transaction(async (tx) => {
		const [created] = await tx.insert(person).values(values).returning();
		await writeAdminAudit(tx, {
			actorAuthUserId,
			targetPersonId: created.id,
			action: 'person.created',
			metadata: { fields: 'displayName,legalName,employeeIdentifier,jobTitle,status' }
		});
		return created;
	});
}

export async function updatePerson(
	personId: string,
	input: PersonProfileInput,
	actorAuthUserId: string,
	headers: Headers
): Promise<Person> {
	const values = validatePersonProfile(input);
	return db.transaction(async (tx) => {
		await tx.execute(sql`select id from ${person} where id = ${personId} for update`);
		const [current] = await tx.select().from(person).where(eq(person.id, personId)).limit(1);
		if (!current) throw new Error('Person not found.');
		if (current.status === 'active' && values.status === 'inactive') {
			const blockingTeams = await tx
				.select({ id: team.id, name: team.name })
				.from(team)
				.where(and(eq(team.managerPersonId, personId), eq(team.status, 'active')))
				.orderBy(asc(team.name), asc(team.id));
			if (blockingTeams.length) throw new PersonDeactivationBlockedError(blockingTeams);
		}

		if (current.authUserId && current.displayName !== values.displayName) {
			await auth.api.adminUpdateUser({
				body: { userId: current.authUserId, data: { name: values.displayName } },
				headers
			});
		}

		const [updated] = await tx
			.update(person)
			.set(values)
			.where(eq(person.id, personId))
			.returning();
		await writeAdminAudit(tx, {
			actorAuthUserId,
			targetPersonId: personId,
			targetAuthUserId: current.authUserId,
			action: 'person.updated',
			metadata: { fields: 'displayName,legalName,employeeIdentifier,jobTitle,status' }
		});
		return updated;
	});
}
