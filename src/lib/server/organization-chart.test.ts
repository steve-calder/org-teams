import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { organization, person, team, teamMembership, user } from '$lib/server/db/schema';
import {
	getDefaultOrganizationChartSelection,
	getOrganizationChart,
	listOrganizationChartOptions
} from './organization-chart';

const organizationIds: string[] = [];
const teamIds: string[] = [];
const personIds: string[] = [];
const userIds: string[] = [];

afterEach(async () => {
	if (teamIds.length) {
		await db.delete(teamMembership).where(inArray(teamMembership.teamId, teamIds));
		await db
			.update(team)
			.set({ parentTeamId: null, managerPersonId: null })
			.where(inArray(team.id, teamIds));
		await db.delete(team).where(inArray(team.id, teamIds.splice(0)));
	}
	if (personIds.length) await db.delete(person).where(inArray(person.id, personIds.splice(0)));
	if (userIds.length) await db.delete(user).where(inArray(user.id, userIds.splice(0)));
	if (organizationIds.length) {
		await db.delete(organization).where(inArray(organization.id, organizationIds.splice(0)));
	}
});

async function createOrganization(name: string) {
	const [created] = await db.insert(organization).values({ name }).returning();
	organizationIds.push(created.id);
	return created;
}

async function createTeam(
	organizationId: string,
	name: string,
	parentTeamId: string | null = null,
	managerPersonId: string | null = null
) {
	const [created] = await db
		.insert(team)
		.values({ organizationId, name, parentTeamId, managerPersonId, type: 'functional' })
		.returning();
	teamIds.push(created.id);
	return created;
}

async function createLinkedPerson(displayName: string) {
	const authUserId = randomUUID();
	await db.insert(user).values({
		id: authUserId,
		name: displayName,
		email: `${authUserId}@example.test`,
		emailVerified: true
	});
	userIds.push(authUserId);
	const [created] = await db.insert(person).values({ displayName, authUserId }).returning();
	personIds.push(created.id);
	return { authUserId, person: created };
}

describe('authenticated organization chart read model', () => {
	it('lists Organizations in stable display-name and UUID order', async () => {
		const duplicateIdA = randomUUID();
		const duplicateIdB = randomUUID();
		await db.insert(organization).values([
			{ id: duplicateIdB, name: 'Chart Duplicate' },
			{ id: duplicateIdA, name: 'Chart Duplicate' }
		]);
		organizationIds.push(duplicateIdA, duplicateIdB);

		const options = (await listOrganizationChartOptions()).filter(({ id }) =>
			organizationIds.includes(id)
		);
		expect(options.map(({ id }) => id)).toEqual([duplicateIdA, duplicateIdB].sort());
	});

	it('builds a stable forest with multiple roots and an empty Organization', async () => {
		const owner = await createOrganization('Chart Forest');
		const empty = await createOrganization('Chart Empty');
		const beta = await createTeam(owner.id, 'Beta root');
		const alpha = await createTeam(owner.id, 'Alpha root');
		const child = await createTeam(owner.id, 'Child', alpha.id);

		const chart = await getOrganizationChart(owner.id);
		expect(chart).toMatchObject({ total: 3, hasIntegrityIssue: false });
		expect(chart?.roots.map(({ id }) => id)).toEqual([alpha.id, beta.id]);
		expect(chart?.roots[0].children).toMatchObject([{ id: child.id, children: [] }]);
		expect(await getOrganizationChart(empty.id)).toMatchObject({ roots: [], total: 0 });
	});

	it('includes an assigned manager exactly once in participant context', async () => {
		const owner = await createOrganization('Chart Participants');
		const [manager, member] = await db
			.insert(person)
			.values([{ displayName: 'Chart manager' }, { displayName: 'Chart member' }])
			.returning();
		personIds.push(manager.id, member.id);
		const managed = await createTeam(owner.id, 'Managed', null, manager.id);
		const unmanaged = await createTeam(owner.id, 'Unmanaged');
		await db.insert(teamMembership).values({
			personId: member.id,
			teamId: managed.id,
			role: 'Contributor'
		});

		const chart = await getOrganizationChart(owner.id);
		expect(chart?.roots.find(({ id }) => id === managed.id)).toMatchObject({
			manager: { id: manager.id, displayName: 'Chart manager' },
			ordinaryMembershipCount: 1,
			participantCount: 2
		});
		expect(chart?.roots.find(({ id }) => id === unmanaged.id)).toMatchObject({
			manager: null,
			ordinaryMembershipCount: 0,
			participantCount: 0
		});
	});

	it('returns undefined for an unknown Organization', async () => {
		expect(await getOrganizationChart(randomUUID())).toBeUndefined();
	});

	it('selects a stable ordinary or managed Team for the authenticated user', async () => {
		const { authUserId, person: viewer } = await createLinkedPerson('Chart default viewer');
		const betaOrganization = await createOrganization('Chart Default Beta');
		const alphaOrganization = await createOrganization('Chart Default Alpha');
		const managed = await createTeam(betaOrganization.id, 'Managed Team', null, viewer.id);
		const ordinary = await createTeam(alphaOrganization.id, 'Ordinary Team');
		await db.insert(teamMembership).values({
			personId: viewer.id,
			teamId: ordinary.id,
			role: 'Contributor'
		});

		expect(await getDefaultOrganizationChartSelection(authUserId)).toEqual({
			organizationId: alphaOrganization.id,
			teamId: ordinary.id
		});
		expect(managed.managerPersonId).toBe(viewer.id);
	});

	it('returns no default Team for an unlinked authenticated user', async () => {
		expect(await getDefaultOrganizationChartSelection(randomUUID())).toBeNull();
	});
});
