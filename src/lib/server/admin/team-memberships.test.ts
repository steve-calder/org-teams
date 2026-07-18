import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { adminAuditEvent, organization, person, team, teamMembership } from '$lib/server/db/schema';
import { assignTeamManager } from './team-hierarchy';
import {
	createTeamMembership,
	getPersonMembershipAdminContext,
	getTeamMembershipAdminContext,
	removeTeamMembership,
	updateTeamMembershipRole
} from './team-memberships';

const organizationIds: string[] = [];
const teamIds: string[] = [];
const personIds: string[] = [];

afterEach(async () => {
	if (teamIds.length) {
		await db.delete(adminAuditEvent).where(inArray(adminAuditEvent.targetTeamId, teamIds));
		await db.delete(teamMembership).where(inArray(teamMembership.teamId, teamIds));
		await db.update(team).set({ managerPersonId: null }).where(inArray(team.id, teamIds));
		await db.delete(team).where(inArray(team.id, teamIds.splice(0)));
	}
	if (personIds.length) {
		await db.delete(adminAuditEvent).where(inArray(adminAuditEvent.targetPersonId, personIds));
		await db.delete(person).where(inArray(person.id, personIds.splice(0)));
	}
	if (organizationIds.length) {
		await db.delete(organization).where(inArray(organization.id, organizationIds.splice(0)));
	}
});

async function makeOrganization(name: string) {
	const [created] = await db.insert(organization).values({ name }).returning();
	organizationIds.push(created.id);
	return created;
}

async function makePerson(displayName: string, status: 'active' | 'inactive' = 'active') {
	const [created] = await db.insert(person).values({ displayName, status }).returning();
	personIds.push(created.id);
	return created;
}

async function makeTeam(
	organizationId: string,
	name: string,
	values: Partial<typeof team.$inferInsert> = {}
) {
	const [created] = await db
		.insert(team)
		.values({ organizationId, name, type: 'functional', ...values })
		.returning();
	teamIds.push(created.id);
	return created;
}

describe('Team membership administration', () => {
	it('lists multiple cross-Organization memberships with contextual managers and no primary', async () => {
		const firstOrganization = await makeOrganization('First Organization');
		const secondOrganization = await makeOrganization('Second Organization');
		const member = await makePerson('Cross-org member');
		const firstManager = await makePerson('First manager');
		const secondManager = await makePerson('Second manager');
		const firstTeam = await makeTeam(firstOrganization.id, 'Alpha Team', {
			managerPersonId: firstManager.id
		});
		const secondTeam = await makeTeam(secondOrganization.id, 'Beta Team', {
			managerPersonId: secondManager.id
		});

		await createTeamMembership(member.id, firstTeam.id, ' Engineer ', randomUUID());
		await createTeamMembership(member.id, secondTeam.id, 'Advisor', randomUUID());

		const personContext = await getPersonMembershipAdminContext(member.id);
		expect(personContext?.ordinaryMemberships).toEqual([
			expect.objectContaining({
				teamId: firstTeam.id,
				role: 'Engineer',
				organizationName: firstOrganization.name,
				contextualManager: expect.objectContaining({ id: firstManager.id })
			}),
			expect.objectContaining({
				teamId: secondTeam.id,
				role: 'Advisor',
				organizationName: secondOrganization.name,
				contextualManager: expect.objectContaining({ id: secondManager.id })
			})
		]);
		expect(personContext).not.toHaveProperty('primaryTeam');

		const roster = await getTeamMembershipAdminContext(firstTeam.id);
		expect(roster?.roster).toEqual([
			expect.objectContaining({ kind: 'manager', personId: firstManager.id, role: 'Team manager' }),
			expect.objectContaining({ kind: 'member', personId: member.id, role: 'Engineer' })
		]);
	});

	it('validates roles, active endpoints, duplicates, and manager redundancy', async () => {
		const owner = await makeOrganization('Validation Organization');
		const member = await makePerson('Eligible member');
		const inactivePerson = await makePerson('Inactive member', 'inactive');
		const activeTeam = await makeTeam(owner.id, 'Active Team');
		const inactiveTeam = await makeTeam(owner.id, 'Inactive Team', { status: 'inactive' });

		await expect(createTeamMembership(member.id, activeTeam.id, ' ', randomUUID())).rejects.toThrow(
			'between 1 and 160'
		);
		await expect(
			createTeamMembership(inactivePerson.id, activeTeam.id, 'Observer', randomUUID())
		).rejects.toThrow('active Person');
		await expect(
			createTeamMembership(member.id, inactiveTeam.id, 'Observer', randomUUID())
		).rejects.toThrow('active Team');

		await createTeamMembership(member.id, activeTeam.id, 'Contributor', randomUUID());
		await expect(
			createTeamMembership(member.id, activeTeam.id, 'Duplicate', randomUUID())
		).rejects.toThrow('already a member');
		await removeTeamMembership(
			(await db.query.teamMembership.findFirst({
				where: and(eq(teamMembership.personId, member.id), eq(teamMembership.teamId, activeTeam.id))
			}))!.id,
			randomUUID()
		);
		await assignTeamManager(activeTeam.id, member.id, randomUUID());
		await expect(
			createTeamMembership(member.id, activeTeam.id, 'Manager duplicate', randomUUID())
		).rejects.toThrow('already counts as a member');
	});

	it('updates and removes roles atomically with Person- and Team-targeted audit history', async () => {
		const owner = await makeOrganization('Audit Organization');
		const member = await makePerson('Audited member');
		const memberTeam = await makeTeam(owner.id, 'Audited Team');
		const actor = randomUUID();
		const membership = await createTeamMembership(member.id, memberTeam.id, 'Developer', actor);

		await updateTeamMembershipRole(membership.id, 'Principal developer', actor);
		await removeTeamMembership(membership.id, actor);

		expect(
			await db.query.adminAuditEvent.findMany({
				where: and(
					eq(adminAuditEvent.targetPersonId, member.id),
					eq(adminAuditEvent.targetTeamId, memberTeam.id)
				),
				orderBy: (event, { asc }) => [asc(event.createdAt)]
			})
		).toEqual([
			expect.objectContaining({
				action: 'team_membership.created',
				metadata: expect.objectContaining({ membershipId: membership.id, role: 'Developer' })
			}),
			expect.objectContaining({
				action: 'team_membership.role_changed',
				metadata: expect.objectContaining({
					membershipId: membership.id,
					previousRole: 'Developer',
					role: 'Principal developer'
				})
			}),
			expect.objectContaining({
				action: 'team_membership.removed',
				metadata: expect.objectContaining({
					membershipId: membership.id,
					previousRole: 'Principal developer'
				})
			})
		]);
		expect(
			await db.query.teamMembership.findFirst({ where: eq(teamMembership.id, membership.id) })
		).toBeUndefined();
	});

	it('retains membership across lifecycle changes but suppresses current manager context', async () => {
		const owner = await makeOrganization('Lifecycle Organization');
		const member = await makePerson('Lifecycle member');
		const manager = await makePerson('Lifecycle manager');
		const memberTeam = await makeTeam(owner.id, 'Lifecycle Team', {
			managerPersonId: manager.id
		});
		const membership = await createTeamMembership(
			member.id,
			memberTeam.id,
			'Analyst',
			randomUUID()
		);

		await db.update(person).set({ status: 'inactive' }).where(eq(person.id, member.id));
		expect(
			(await getPersonMembershipAdminContext(member.id))?.ordinaryMemberships[0]
		).toMatchObject({ membershipId: membership.id, contextualManager: null });
		expect(
			await db.query.teamMembership.findFirst({ where: eq(teamMembership.id, membership.id) })
		).toBeDefined();

		await db.update(person).set({ status: 'active' }).where(eq(person.id, member.id));
		expect(
			(await getPersonMembershipAdminContext(member.id))?.ordinaryMemberships[0]
		).toMatchObject({ contextualManager: { id: manager.id } });
	});

	it('reconciles promotion and concurrent duplicate assignment without duplicate rows', async () => {
		const owner = await makeOrganization('Concurrency Organization');
		const member = await makePerson('Promoted member');
		const memberTeam = await makeTeam(owner.id, 'Promotion Team');
		const actor = randomUUID();
		const membership = await createTeamMembership(member.id, memberTeam.id, 'Lead', actor);

		await assignTeamManager(memberTeam.id, member.id, actor);
		expect(
			await db.query.teamMembership.findFirst({ where: eq(teamMembership.id, membership.id) })
		).toBeUndefined();
		expect((await getTeamMembershipAdminContext(memberTeam.id))?.roster).toEqual([
			expect.objectContaining({ kind: 'manager', personId: member.id })
		]);
		expect(
			await db.query.adminAuditEvent.findFirst({
				where: and(
					eq(adminAuditEvent.targetPersonId, member.id),
					eq(adminAuditEvent.targetTeamId, memberTeam.id),
					eq(adminAuditEvent.action, 'team_membership.removed')
				)
			})
		).toMatchObject({
			metadata: expect.objectContaining({ previousRole: 'Lead', reason: 'managerPromotion' })
		});
		expect(
			await db.query.adminAuditEvent.findFirst({
				where: and(
					eq(adminAuditEvent.targetTeamId, memberTeam.id),
					eq(adminAuditEvent.action, 'team.manager_changed')
				)
			})
		).toMatchObject({
			metadata: expect.objectContaining({ managerPersonId: member.id })
		});

		await assignTeamManager(memberTeam.id, null, actor);
		expect(
			await db.query.teamMembership.findFirst({
				where: and(eq(teamMembership.personId, member.id), eq(teamMembership.teamId, memberTeam.id))
			})
		).toBeUndefined();

		const attempts = await Promise.allSettled([
			createTeamMembership(member.id, memberTeam.id, 'One', actor),
			createTeamMembership(member.id, memberTeam.id, 'Two', actor)
		]);
		expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
		expect(attempts.filter((attempt) => attempt.status === 'rejected')).toHaveLength(1);
		expect(
			await db
				.select()
				.from(teamMembership)
				.where(
					and(eq(teamMembership.personId, member.id), eq(teamMembership.teamId, memberTeam.id))
				)
		).toHaveLength(1);
	});
});
