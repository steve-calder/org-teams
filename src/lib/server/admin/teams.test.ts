import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { adminAuditEvent, organization, team } from '$lib/server/db/schema';
import { createOrganization, updateOrganization } from './organizations';
import {
	createTeam,
	getTeamAdminDetail,
	isTeamType,
	listTeams,
	teamTypeLabel,
	transferTeam,
	updateTeam,
	validateTeamProfile
} from './teams';

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

describe('Team administration services', () => {
	it('centralizes controlled types and normalizes profiles', () => {
		expect(isTeamType('department')).toBe(true);
		expect(isTeamType('unknown')).toBe(false);
		expect(teamTypeLabel('community')).toBe('Community');
		expect(
			validateTeamProfile({ name: '  Platform  ', purpose: '  Shared  ', type: 'product' })
		).toEqual({
			name: 'Platform',
			purpose: 'Shared',
			type: 'product',
			status: 'active'
		});
		expect(() => validateTeamProfile({ name: 'Team', type: 'unknown' })).toThrow('recognized');
	});

	it('lists duplicate names with combined filters and Organization context', async () => {
		const owner = await trackedOrganization('Directory Owner');
		for (const type of ['product', 'department'] as const) {
			const created = await createTeam(
				{ organizationId: owner.id, name: 'Duplicate Team', type },
				actor
			);
			teamIds.push(created.id);
		}
		const result = await listTeams({
			search: 'Duplicate',
			organizationId: owner.id,
			type: 'product',
			status: 'active'
		});
		expect(result.teams).toHaveLength(1);
		expect(result.teams[0]).toMatchObject({
			team: { type: 'product' },
			organization: { id: owner.id }
		});
		expect(await getTeamAdminDetail(result.teams[0].team.id)).toMatchObject({
			organization: { id: owner.id }
		});
	});

	it('enforces lifecycle ownership and confirmed transfers', async () => {
		const source = await trackedOrganization('Transfer Source');
		const destination = await trackedOrganization('Transfer Destination');
		const inactive = await trackedOrganization('Inactive Destination', 'inactive');
		await expect(
			createTeam({ organizationId: inactive.id, name: 'Rejected Team', type: 'other' }, actor)
		).rejects.toThrow('must be active');
		const created = await createTeam(
			{ organizationId: source.id, name: 'Transfer Team', type: 'project' },
			actor
		);
		teamIds.push(created.id);

		await expect(transferTeam(created.id, destination.id, false, actor)).rejects.toThrow('Confirm');
		await expect(transferTeam(created.id, inactive.id, true, actor)).rejects.toThrow(
			'must be active'
		);
		const transferred = await transferTeam(created.id, destination.id, true, actor);
		expect(transferred).toMatchObject({
			id: created.id,
			organizationId: destination.id,
			status: created.status
		});
		const transferAudit = await db.query.adminAuditEvent.findFirst({
			where: and(
				eq(adminAuditEvent.targetTeamId, created.id),
				eq(adminAuditEvent.action, 'team.transferred')
			)
		});
		expect(transferAudit?.metadata).toMatchObject({
			sourceOrganizationId: source.id,
			destinationOrganizationId: destination.id
		});
	});

	it('preserves lifecycle integrity under concurrent activation and deactivation', async () => {
		const owner = await trackedOrganization('Concurrent Owner');
		const inactiveTeam = await createTeam(
			{ organizationId: owner.id, name: 'Concurrent Team', type: 'delivery', status: 'inactive' },
			actor
		);
		teamIds.push(inactiveTeam.id);
		await Promise.allSettled([
			updateOrganization(owner.id, { name: owner.name, status: 'inactive' }, actor),
			updateTeam(
				inactiveTeam.id,
				{ name: inactiveTeam.name, type: inactiveTeam.type, status: 'active' },
				actor
			)
		]);
		const [storedOwner, storedTeam] = await Promise.all([
			db.query.organization.findFirst({ where: eq(organization.id, owner.id) }),
			db.query.team.findFirst({ where: eq(team.id, inactiveTeam.id) })
		]);
		expect(storedOwner?.status === 'inactive' && storedTeam?.status === 'active').toBe(false);
	});
});
