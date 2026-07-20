import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { adminAuditEvent, organization, team } from '$lib/server/db/schema';
import {
	createOrganization,
	getOrganizationAdminDetail,
	listOrganizations,
	OrganizationDeactivationBlockedError,
	updateOrganization,
	validateOrganizationProfile
} from './organizations';
import { createTeam, transferTeam, updateTeam } from './teams';

const organizationIds: string[] = [];
const teamIds: string[] = [];
const actor = randomUUID();

afterEach(async () => {
	if (teamIds.length) {
		await db.delete(adminAuditEvent).where(inArray(adminAuditEvent.targetTeamId, teamIds));
		await db.delete(team).where(inArray(team.id, teamIds.splice(0)));
	}
	if (organizationIds.length) {
		await db
			.delete(adminAuditEvent)
			.where(inArray(adminAuditEvent.targetOrganizationId, organizationIds));
		await db.delete(organization).where(inArray(organization.id, organizationIds.splice(0)));
	}
});

async function trackedOrganization(name: string, status: 'active' | 'inactive' = 'active') {
	const created = await createOrganization({ name, status }, actor);
	organizationIds.push(created.id);
	return created;
}

describe('Organization administration services', () => {
	it('normalizes values and rejects invalid profiles', () => {
		expect(validateOrganizationProfile({ name: '  Acme  ', description: '  Example  ' })).toEqual({
			name: 'Acme',
			description: 'Example',
			status: 'active'
		});
		expect(() => validateOrganizationProfile({ name: ' ' })).toThrow('required');
		expect(() => validateOrganizationProfile({ name: 'x'.repeat(161) })).toThrow('160');
	});

	it('lists duplicate names with stable filters and returns detail', async () => {
		const first = await trackedOrganization('Service Duplicate');
		await trackedOrganization('Service Duplicate');
		await trackedOrganization('Service Inactive', 'inactive');
		const result = await listOrganizations({ search: 'Service', status: 'active', pageSize: 2 });
		expect(result.organizations).toHaveLength(2);
		expect(result.total).toBeGreaterThanOrEqual(2);
		expect(result.organizations.map((row) => row.organization.id)).toEqual(
			[...result.organizations.map((row) => row.organization.id)].sort()
		);
		expect(await getOrganizationAdminDetail(first.id)).toMatchObject({
			organization: { id: first.id }
		});
	});

	it('blocks deactivation until active Teams are transferred or inactive', async () => {
		const source = await trackedOrganization('Lifecycle Source');
		const destination = await trackedOrganization('Lifecycle Destination');
		const activeTeam = await createTeam(
			{ organizationId: source.id, name: 'Blocking Team', type: 'department' },
			actor
		);
		teamIds.push(activeTeam.id);

		await expect(
			updateOrganization(source.id, { name: source.name, status: 'inactive' }, actor)
		).rejects.toMatchObject({
			name: OrganizationDeactivationBlockedError.name,
			blockingTeams: [{ id: activeTeam.id, name: activeTeam.name }]
		});
		await transferTeam(activeTeam.id, destination.id, true, actor);
		const inactiveSource = await updateOrganization(
			source.id,
			{ name: source.name, status: 'inactive' },
			actor
		);
		expect(inactiveSource.status).toBe('inactive');

		await updateTeam(
			activeTeam.id,
			{ name: activeTeam.name, type: activeTeam.type, status: 'inactive' },
			actor
		);
		const audit = await db.query.adminAuditEvent.findFirst({
			where: eq(adminAuditEvent.targetOrganizationId, source.id)
		});
		expect(audit?.action).toMatch(/^organization\./);
	});
});
