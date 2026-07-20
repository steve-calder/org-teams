import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { adminAuditEvent, organization, person, team } from '$lib/server/db/schema';
import { createOrganization, updateOrganization } from './organizations';
import { assignTeamManager, assignTeamParent } from './team-hierarchy';
import {
	createTeam,
	getTeamAdminDetail,
	isTeamType,
	listTeams,
	teamTypeLabel,
	TeamDeactivationBlockedError,
	TeamTransferBlockedError,
	transferTeam,
	updateTeam,
	validateTeamProfile
} from './teams';

const organizationIds: string[] = [];
const teamIds: string[] = [];
const personIds: string[] = [];
const actor = randomUUID();

afterEach(async () => {
	if (teamIds.length) {
		await db.delete(adminAuditEvent).where(inArray(adminAuditEvent.targetTeamId, teamIds));
		await db
			.update(team)
			.set({ parentTeamId: null, managerPersonId: null })
			.where(inArray(team.id, teamIds));
		await db.delete(team).where(inArray(team.id, teamIds.splice(0)));
	}
	if (personIds.length) await db.delete(person).where(inArray(person.id, personIds.splice(0)));
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

	it('blocks hierarchy-bearing transfers and preserves a root leaf manager after resolution', async () => {
		const source = await trackedOrganization('Hierarchy Transfer Source');
		const destination = await trackedOrganization('Hierarchy Transfer Destination');
		const parent = await createTeam(
			{ organizationId: source.id, name: 'Parent Transfer Team', type: 'department' },
			actor
		);
		const child = await createTeam(
			{ organizationId: source.id, name: 'Child Transfer Team', type: 'functional' },
			actor
		);
		teamIds.push(parent.id, child.id);
		const [manager] = await db
			.insert(person)
			.values({ displayName: 'Transfer Manager' })
			.returning();
		personIds.push(manager.id);
		await assignTeamManager(child.id, manager.id, actor);
		await assignTeamParent(child.id, parent.id, actor);

		await expect(transferTeam(parent.id, destination.id, true, actor)).rejects.toMatchObject({
			name: TeamTransferBlockedError.name,
			blockingTeams: [{ id: child.id, name: child.name }]
		});
		await expect(transferTeam(child.id, destination.id, true, actor)).rejects.toMatchObject({
			name: TeamTransferBlockedError.name,
			blockingTeams: [{ id: parent.id, name: parent.name }]
		});
		await assignTeamParent(child.id, null, actor);
		const transferred = await transferTeam(child.id, destination.id, true, actor);
		expect(transferred).toMatchObject({
			organizationId: destination.id,
			parentTeamId: null,
			managerPersonId: manager.id
		});
	});

	it('blocks parent deactivation until all active descendants are inactive', async () => {
		const owner = await trackedOrganization('Hierarchy Lifecycle Owner');
		const root = await createTeam(
			{ organizationId: owner.id, name: 'Lifecycle Root', type: 'department' },
			actor
		);
		const child = await createTeam(
			{ organizationId: owner.id, name: 'Lifecycle Child', type: 'functional' },
			actor
		);
		teamIds.push(root.id, child.id);
		await assignTeamParent(child.id, root.id, actor);

		await expect(
			updateTeam(root.id, { name: root.name, type: root.type, status: 'inactive' }, actor)
		).rejects.toMatchObject({
			name: TeamDeactivationBlockedError.name,
			blockingTeams: [{ id: child.id, name: child.name }]
		});
		await updateTeam(child.id, { name: child.name, type: child.type, status: 'inactive' }, actor);
		const inactiveRoot = await updateTeam(
			root.id,
			{ name: root.name, type: root.type, status: 'inactive' },
			actor
		);
		expect(inactiveRoot.status).toBe('inactive');
		await expect(
			updateTeam(child.id, { name: child.name, type: child.type, status: 'active' }, actor)
		).rejects.toThrow('active parent');
	});

	it('serializes competing parent assignments without creating a cycle', async () => {
		const owner = await trackedOrganization('Concurrent Hierarchy Owner');
		const first = await createTeam(
			{ organizationId: owner.id, name: 'Concurrent First', type: 'functional' },
			actor
		);
		const second = await createTeam(
			{ organizationId: owner.id, name: 'Concurrent Second', type: 'functional' },
			actor
		);
		teamIds.push(first.id, second.id);

		const outcomes = await Promise.allSettled([
			assignTeamParent(first.id, second.id, actor),
			assignTeamParent(second.id, first.id, actor)
		]);
		expect(outcomes.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
		const stored = await db
			.select({ id: team.id, parentTeamId: team.parentTeamId })
			.from(team)
			.where(inArray(team.id, [first.id, second.id]));
		expect(stored.filter(({ parentTeamId }) => parentTeamId)).toHaveLength(1);
	});
});
