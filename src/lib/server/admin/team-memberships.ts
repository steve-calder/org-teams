import { asc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { person, team, teamMembership, type TeamMembership } from '$lib/server/db/schema';
import { writeAdminAudit } from './audit';

type AdminTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class TeamMembershipValidationError extends Error {}

export interface MembershipManagerSummary {
	id: string;
	displayName: string;
	status: 'active' | 'inactive';
}

export interface TeamRosterEntry {
	kind: 'manager' | 'member';
	membershipId: string | null;
	personId: string;
	displayName: string;
	personStatus: 'active' | 'inactive';
	role: string;
	contextualManager: MembershipManagerSummary | null;
}

export function normalizeTeamRole(value: string): string {
	const role = value.trim();
	if (!role || role.length > 160) {
		throw new TeamMembershipValidationError('Role must contain between 1 and 160 characters.');
	}
	return role;
}

const byNameAndId = (
	left: { displayName: string; personId: string },
	right: { displayName: string; personId: string }
) =>
	left.displayName.localeCompare(right.displayName) || left.personId.localeCompare(right.personId);

export async function getTeamMembershipAdminContext(teamId: string) {
	const detail = await db.query.team.findFirst({
		where: eq(team.id, teamId),
		with: {
			organization: true,
			manager: true,
			memberships: { with: { person: true } }
		}
	});
	if (!detail) return undefined;

	const manager = detail.manager
		? {
				id: detail.manager.id,
				displayName: detail.manager.displayName,
				status: detail.manager.status
			}
		: null;
	const roster: TeamRosterEntry[] = [
		...(detail.manager
			? [
					{
						kind: 'manager' as const,
						membershipId: null,
						personId: detail.manager.id,
						displayName: detail.manager.displayName,
						personStatus: detail.manager.status,
						role: 'Team manager',
						contextualManager: null
					}
				]
			: []),
		...detail.memberships
			.filter((membership) => membership.personId !== detail.managerPersonId)
			.map((membership) => ({
				kind: 'member' as const,
				membershipId: membership.id,
				personId: membership.person.id,
				displayName: membership.person.displayName,
				personStatus: membership.person.status,
				role: membership.role,
				contextualManager:
					detail.status === 'active' &&
					membership.person.status === 'active' &&
					manager?.status === 'active'
						? manager
						: null
			}))
	].sort((left, right) => {
		if (left.kind !== right.kind) return left.kind === 'manager' ? -1 : 1;
		return byNameAndId(left, right);
	});

	const activePeople = await db
		.select({ id: person.id, displayName: person.displayName, status: person.status })
		.from(person)
		.where(eq(person.status, 'active'))
		.orderBy(asc(person.displayName), asc(person.id));
	const assignedPersonIds = new Set(detail.memberships.map((membership) => membership.personId));
	if (detail.managerPersonId) assignedPersonIds.add(detail.managerPersonId);

	return {
		team: {
			id: detail.id,
			name: detail.name,
			status: detail.status,
			organizationId: detail.organizationId
		},
		organization: detail.organization,
		manager,
		roster,
		eligiblePeople:
			detail.status === 'active'
				? activePeople.filter((candidate) => !assignedPersonIds.has(candidate.id))
				: []
	};
}

export async function getPersonMembershipAdminContext(personId: string) {
	const detail = await db.query.person.findFirst({
		where: eq(person.id, personId),
		with: {
			memberships: {
				with: { team: { with: { organization: true, manager: true } } }
			},
			managedTeams: { with: { organization: true } }
		}
	});
	if (!detail) return undefined;

	const ordinaryMemberships = detail.memberships
		.map((membership) => {
			const manager = membership.team.manager;
			return {
				kind: 'member' as const,
				membershipId: membership.id,
				teamId: membership.teamId,
				teamName: membership.team.name,
				teamStatus: membership.team.status,
				organizationId: membership.team.organization.id,
				organizationName: membership.team.organization.name,
				organizationStatus: membership.team.organization.status,
				role: membership.role,
				contextualManager:
					detail.status === 'active' &&
					membership.team.status === 'active' &&
					manager?.status === 'active'
						? {
								id: manager.id,
								displayName: manager.displayName,
								status: manager.status
							}
						: null
			};
		})
		.sort(
			(left, right) =>
				left.organizationName.localeCompare(right.organizationName) ||
				left.teamName.localeCompare(right.teamName) ||
				left.teamId.localeCompare(right.teamId)
		);
	const managedTeams = detail.managedTeams
		.map((managedTeam) => ({
			kind: 'manager' as const,
			membershipId: null,
			teamId: managedTeam.id,
			teamName: managedTeam.name,
			teamStatus: managedTeam.status,
			organizationId: managedTeam.organization.id,
			organizationName: managedTeam.organization.name,
			organizationStatus: managedTeam.organization.status,
			role: 'Team manager',
			contextualManager: null
		}))
		.sort(
			(left, right) =>
				left.organizationName.localeCompare(right.organizationName) ||
				left.teamName.localeCompare(right.teamName) ||
				left.teamId.localeCompare(right.teamId)
		);

	const activeTeams = await db.query.team.findMany({
		where: eq(team.status, 'active'),
		with: { organization: true },
		orderBy: [asc(team.name), asc(team.id)]
	});
	const assignedTeamIds = new Set([
		...detail.memberships.map((membership) => membership.teamId),
		...detail.managedTeams.map((managedTeam) => managedTeam.id)
	]);

	return {
		person: { id: detail.id, displayName: detail.displayName, status: detail.status },
		ordinaryMemberships,
		managedTeams,
		eligibleTeams:
			detail.status === 'active'
				? activeTeams
						.filter((candidate) => !assignedTeamIds.has(candidate.id))
						.map((candidate) => ({
							id: candidate.id,
							name: candidate.name,
							organizationId: candidate.organization.id,
							organizationName: candidate.organization.name
						}))
				: []
	};
}

async function lockTeam(tx: AdminTransaction, teamId: string) {
	await tx.execute(sql`select id from ${team} where id = ${teamId} for update`);
	const [currentTeam] = await tx.select().from(team).where(eq(team.id, teamId)).limit(1);
	if (!currentTeam) throw new TeamMembershipValidationError('Team not found.');
	return currentTeam;
}

async function requireActivePerson(tx: AdminTransaction, personId: string) {
	await tx.execute(sql`select id from ${person} where id = ${personId} for update`);
	const [currentPerson] = await tx.select().from(person).where(eq(person.id, personId)).limit(1);
	if (!currentPerson) throw new TeamMembershipValidationError('Person not found.');
	if (currentPerson.status !== 'active') {
		throw new TeamMembershipValidationError('Select an active Person for Team membership.');
	}
	return currentPerson;
}

export async function createTeamMembership(
	personId: string,
	teamId: string,
	roleInput: string,
	actorAuthUserId: string
): Promise<TeamMembership> {
	const role = normalizeTeamRole(roleInput);
	return db.transaction(async (tx) => {
		const currentTeam = await lockTeam(tx, teamId);
		if (currentTeam.status !== 'active') {
			throw new TeamMembershipValidationError('Select an active Team for membership.');
		}
		await requireActivePerson(tx, personId);
		if (currentTeam.managerPersonId === personId) {
			throw new TeamMembershipValidationError(
				'The Team manager already counts as a member and cannot have an ordinary membership.'
			);
		}
		const [existing] = await tx
			.select({ id: teamMembership.id })
			.from(teamMembership)
			.where(sql`${teamMembership.personId} = ${personId} and ${teamMembership.teamId} = ${teamId}`)
			.limit(1);
		if (existing) {
			throw new TeamMembershipValidationError('This Person is already a member of the Team.');
		}
		const [created] = await tx
			.insert(teamMembership)
			.values({ personId, teamId, role })
			.returning();
		await writeAdminAudit(tx, {
			actorAuthUserId,
			targetPersonId: personId,
			targetTeamId: teamId,
			action: 'team_membership.created',
			metadata: { membershipId: created.id, role }
		});
		return created;
	});
}

async function loadLockedMembership(tx: AdminTransaction, membershipId: string) {
	const [initial] = await tx
		.select()
		.from(teamMembership)
		.where(eq(teamMembership.id, membershipId))
		.limit(1);
	if (!initial) throw new TeamMembershipValidationError('Team membership not found.');
	const currentTeam = await lockTeam(tx, initial.teamId);
	const [current] = await tx
		.select()
		.from(teamMembership)
		.where(eq(teamMembership.id, membershipId))
		.limit(1);
	if (!current || current.teamId !== initial.teamId) {
		throw new TeamMembershipValidationError('Team membership changed; retry the operation.');
	}
	return { current, currentTeam };
}

function validateMembershipScope(
	membership: TeamMembership,
	expected: { teamId?: string; personId?: string }
) {
	if (expected.teamId && membership.teamId !== expected.teamId) {
		throw new TeamMembershipValidationError('Team membership does not belong to this Team.');
	}
	if (expected.personId && membership.personId !== expected.personId) {
		throw new TeamMembershipValidationError('Team membership does not belong to this Person.');
	}
}

export async function updateTeamMembershipRole(
	membershipId: string,
	roleInput: string,
	actorAuthUserId: string,
	expected: { teamId?: string; personId?: string } = {}
): Promise<TeamMembership> {
	const role = normalizeTeamRole(roleInput);
	return db.transaction(async (tx) => {
		const { current, currentTeam } = await loadLockedMembership(tx, membershipId);
		validateMembershipScope(current, expected);
		if (currentTeam.status !== 'active') {
			throw new TeamMembershipValidationError(
				'Membership roles can be edited only on active Teams.'
			);
		}
		await requireActivePerson(tx, current.personId);
		if (currentTeam.managerPersonId === current.personId) {
			throw new TeamMembershipValidationError(
				'The Team manager cannot have an ordinary membership.'
			);
		}
		if (current.role === role) return current;
		const [updated] = await tx
			.update(teamMembership)
			.set({ role })
			.where(eq(teamMembership.id, membershipId))
			.returning();
		await writeAdminAudit(tx, {
			actorAuthUserId,
			targetPersonId: current.personId,
			targetTeamId: current.teamId,
			action: 'team_membership.role_changed',
			metadata: { membershipId, previousRole: current.role, role }
		});
		return updated;
	});
}

export async function removeTeamMembership(
	membershipId: string,
	actorAuthUserId: string,
	expected: { teamId?: string; personId?: string } = {}
): Promise<void> {
	await db.transaction(async (tx) => {
		const { current } = await loadLockedMembership(tx, membershipId);
		validateMembershipScope(current, expected);
		await tx.delete(teamMembership).where(eq(teamMembership.id, membershipId));
		await writeAdminAudit(tx, {
			actorAuthUserId,
			targetPersonId: current.personId,
			targetTeamId: current.teamId,
			action: 'team_membership.removed',
			metadata: { membershipId, previousRole: current.role }
		});
	});
}

export async function reconcileManagerMembership(
	tx: AdminTransaction,
	teamId: string,
	managerPersonId: string,
	actorAuthUserId: string
): Promise<void> {
	const [membership] = await tx
		.select()
		.from(teamMembership)
		.where(
			sql`${teamMembership.personId} = ${managerPersonId} and ${teamMembership.teamId} = ${teamId}`
		)
		.limit(1);
	if (!membership) return;
	await tx.delete(teamMembership).where(eq(teamMembership.id, membership.id));
	await writeAdminAudit(tx, {
		actorAuthUserId,
		targetPersonId: managerPersonId,
		targetTeamId: teamId,
		action: 'team_membership.removed',
		metadata: {
			membershipId: membership.id,
			previousRole: membership.role,
			reason: 'managerPromotion'
		}
	});
}
