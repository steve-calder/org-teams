import { afterEach, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { organization, person, team, teamMembership } from '$lib/server/db/schema';
import { getPersonalDashboard } from './personal';

const organizationIds: string[] = [];
const teamIds: string[] = [];
const personIds: string[] = [];

afterEach(async () => {
	if (teamIds.length) {
		await db.delete(teamMembership).where(inArray(teamMembership.teamId, teamIds));
		await db.delete(team).where(inArray(team.id, teamIds.splice(0)));
	}
	if (personIds.length) await db.delete(person).where(inArray(person.id, personIds.splice(0)));
	if (organizationIds.length) {
		await db.delete(organization).where(inArray(organization.id, organizationIds.splice(0)));
	}
});

async function makeOrganization(name: string, status: 'active' | 'inactive' = 'active') {
	const [created] = await db.insert(organization).values({ name, status }).returning();
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

describe('personal Organization dashboard', () => {
	it('groups and sorts ordinary and managed Team contexts across Organizations', async () => {
		const zetaOrganization = await makeOrganization('Zeta Organization');
		const alphaOrganization = await makeOrganization('Alpha Organization');
		const dashboardPerson = await makePerson('Dashboard Person');
		const alphaManager = await makePerson('Alpha Manager');
		const alphaTeam = await makeTeam(alphaOrganization.id, 'Beta Team', {
			managerPersonId: alphaManager.id
		});
		const managedTeam = await makeTeam(alphaOrganization.id, 'Alpha Team', {
			managerPersonId: dashboardPerson.id
		});
		const zetaTeam = await makeTeam(zetaOrganization.id, 'Zeta Team');
		await db.insert(teamMembership).values([
			{ personId: dashboardPerson.id, teamId: alphaTeam.id, role: 'Architect' },
			{ personId: dashboardPerson.id, teamId: zetaTeam.id, role: 'Advisor' }
		]);

		const dashboard = await getPersonalDashboard(dashboardPerson.id);

		expect(dashboard).toEqual({
			person: { id: dashboardPerson.id, displayName: 'Dashboard Person' },
			organizationCount: 2,
			teamCount: 3,
			organizations: [
				{
					id: alphaOrganization.id,
					name: 'Alpha Organization',
					teams: [
						{
							id: managedTeam.id,
							name: 'Alpha Team',
							kind: 'manager',
							role: 'Team manager',
							contextualManager: null
						},
						{
							id: alphaTeam.id,
							name: 'Beta Team',
							kind: 'member',
							role: 'Architect',
							contextualManager: { id: alphaManager.id, displayName: 'Alpha Manager' }
						}
					]
				},
				{
					id: zetaOrganization.id,
					name: 'Zeta Organization',
					teams: [
						{
							id: zetaTeam.id,
							name: 'Zeta Team',
							kind: 'member',
							role: 'Advisor',
							contextualManager: null
						}
					]
				}
			]
		});
		expect(JSON.stringify(dashboard)).not.toMatch(/authUser|legalName|employeeIdentifier|jobTitle/);
		expect(dashboard).not.toHaveProperty('primaryOrganization');
	});

	it('filters inactive context and defensively deduplicates manager membership', async () => {
		const activeOrganization = await makeOrganization('Active Organization');
		const inactiveOrganization = await makeOrganization('Inactive Organization', 'inactive');
		const dashboardPerson = await makePerson('Current Person');
		const inactiveManager = await makePerson('Inactive Manager', 'inactive');
		const duplicateTeam = await makeTeam(activeOrganization.id, 'Managed Team', {
			managerPersonId: dashboardPerson.id
		});
		const noManagerTeam = await makeTeam(activeOrganization.id, 'No Current Manager', {
			managerPersonId: inactiveManager.id
		});
		const inactiveTeam = await makeTeam(activeOrganization.id, 'Inactive Team', {
			status: 'inactive'
		});
		const inactiveOrganizationTeam = await makeTeam(
			inactiveOrganization.id,
			'Inactive Organization Team'
		);
		await db.insert(teamMembership).values([
			{ personId: dashboardPerson.id, teamId: duplicateTeam.id, role: 'Duplicate role' },
			{ personId: dashboardPerson.id, teamId: noManagerTeam.id, role: 'Current role' },
			{ personId: dashboardPerson.id, teamId: inactiveTeam.id, role: 'Inactive Team role' },
			{
				personId: dashboardPerson.id,
				teamId: inactiveOrganizationTeam.id,
				role: 'Inactive Organization role'
			}
		]);

		const dashboard = await getPersonalDashboard(dashboardPerson.id);
		expect(dashboard?.organizations).toEqual([
			{
				id: activeOrganization.id,
				name: 'Active Organization',
				teams: [
					{
						id: duplicateTeam.id,
						name: 'Managed Team',
						kind: 'manager',
						role: 'Team manager',
						contextualManager: null
					},
					{
						id: noManagerTeam.id,
						name: 'No Current Manager',
						kind: 'member',
						role: 'Current role',
						contextualManager: null
					}
				]
			}
		]);
		expect(dashboard?.teamCount).toBe(2);
	});

	it('returns an empty dashboard for unassigned or inactive People', async () => {
		const unassigned = await makePerson('Unassigned Person');
		const inactive = await makePerson('Inactive Person', 'inactive');
		const owner = await makeOrganization('Lifecycle Organization');
		const retainedTeam = await makeTeam(owner.id, 'Retained Team');
		await db
			.insert(teamMembership)
			.values({ personId: inactive.id, teamId: retainedTeam.id, role: 'Retained role' });

		expect(await getPersonalDashboard(unassigned.id)).toMatchObject({
			person: { id: unassigned.id },
			organizations: [],
			organizationCount: 0,
			teamCount: 0
		});
		expect(await getPersonalDashboard(inactive.id)).toMatchObject({
			person: { id: inactive.id },
			organizations: [],
			organizationCount: 0,
			teamCount: 0
		});
		expect(await getPersonalDashboard('00000000-0000-0000-0000-000000000000')).toBeUndefined();
	});
});
