import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { adminAuditEvent, organization, person, team } from '$lib/server/db/schema';
import { createOrganization } from './organizations';
import {
	assignTeamManager,
	assignTeamParent,
	getTeamHierarchyContext,
	listActiveManagerOptions,
	listEligibleParentOptions,
	listOrganizationTeamHierarchy
} from './team-hierarchy';
import { createTeam } from './teams';

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

async function trackedOrganization(name: string) {
	const created = await createOrganization({ name }, actor);
	organizationIds.push(created.id);
	return created;
}

async function trackedTeam(
	organizationId: string,
	name: string,
	status: 'active' | 'inactive' = 'active'
) {
	const created = await createTeam({ organizationId, name, type: 'functional', status }, actor);
	teamIds.push(created.id);
	return created;
}

async function trackedPerson(displayName: string, status: 'active' | 'inactive' = 'active') {
	const [created] = await db.insert(person).values({ displayName, status }).returning();
	personIds.push(created.id);
	return created;
}

describe('Team hierarchy administration services', () => {
	it('builds a stable tree or forest and clears a parent without moving descendants', async () => {
		const owner = await trackedOrganization('Hierarchy Owner');
		const rootB = await trackedTeam(owner.id, 'Beta Root');
		const rootA = await trackedTeam(owner.id, 'Alpha Root');
		const child = await trackedTeam(owner.id, 'Child');
		const grandchild = await trackedTeam(owner.id, 'Grandchild');

		await assignTeamParent(child.id, rootA.id, actor);
		await assignTeamParent(grandchild.id, child.id, actor);
		const hierarchy = await listOrganizationTeamHierarchy(owner.id);
		expect(hierarchy).toMatchObject({ total: 4, hasIntegrityIssue: false });
		expect(hierarchy.roots.map(({ id }) => id)).toEqual([rootA.id, rootB.id]);
		expect(hierarchy.roots[0].children[0]).toMatchObject({
			id: child.id,
			children: [{ id: grandchild.id }]
		});

		await assignTeamParent(child.id, null, actor);
		const moved = await listOrganizationTeamHierarchy(owner.id);
		expect(moved.roots.map(({ name }) => name)).toEqual(['Alpha Root', 'Beta Root', 'Child']);
		expect(moved.roots.find(({ id }) => id === child.id)?.children).toMatchObject([
			{ id: grandchild.id }
		]);
	});

	it('derives direct manager supervision and audits parent and manager changes', async () => {
		const owner = await trackedOrganization('Manager Hierarchy Owner');
		const parentTeam = await trackedTeam(owner.id, 'Engineering');
		const childTeam = await trackedTeam(owner.id, 'Platform');
		const parentManager = await trackedPerson('Engineering Manager');
		const childManager = await trackedPerson('Platform Manager');

		await assignTeamManager(parentTeam.id, parentManager.id, actor);
		await assignTeamManager(childTeam.id, childManager.id, actor);
		await assignTeamParent(childTeam.id, parentTeam.id, actor);
		expect(await getTeamHierarchyContext(childTeam.id)).toMatchObject({
			parent: { id: parentTeam.id, manager: { id: parentManager.id } },
			manager: { id: childManager.id },
			supervisor: { id: parentManager.id }
		});

		const audits = await db.query.adminAuditEvent.findMany({
			where: and(
				eq(adminAuditEvent.targetTeamId, childTeam.id),
				eq(adminAuditEvent.action, 'team.parent_changed')
			)
		});
		expect(audits).toHaveLength(1);
		expect(audits[0].metadata).toMatchObject({
			field: 'parentTeamId',
			previousParentTeamId: null,
			parentTeamId: parentTeam.id
		});
	});

	it('rejects cross-Organization parents, self-parenting, descendants, and inactive parents', async () => {
		const owner = await trackedOrganization('Validation Owner');
		const otherOwner = await trackedOrganization('Other Owner');
		const root = await trackedTeam(owner.id, 'Root');
		const child = await trackedTeam(owner.id, 'Child');
		const inactive = await trackedTeam(owner.id, 'Inactive Parent', 'inactive');
		const external = await trackedTeam(otherOwner.id, 'External');

		await expect(assignTeamParent(root.id, root.id, actor)).rejects.toThrow('own parent');
		await expect(assignTeamParent(root.id, external.id, actor)).rejects.toThrow(
			'same Organization'
		);
		await expect(assignTeamParent(root.id, inactive.id, actor)).rejects.toThrow('active parent');
		await assignTeamParent(child.id, root.id, actor);
		await expect(assignTeamParent(root.id, child.id, actor)).rejects.toThrow('cycle');
		expect((await getTeamHierarchyContext(root.id))?.parent).toBeNull();
	});

	it('limits manager choices and prevents one Person managing an ancestor and descendant', async () => {
		const owner = await trackedOrganization('Manager Validation Owner');
		const root = await trackedTeam(owner.id, 'Root');
		const child = await trackedTeam(owner.id, 'Child');
		const activeManager = await trackedPerson('Active Manager');
		const inactiveManager = await trackedPerson('Inactive Manager', 'inactive');
		await assignTeamParent(child.id, root.id, actor);

		expect((await listActiveManagerOptions()).map(({ id }) => id)).toContain(activeManager.id);
		expect((await listActiveManagerOptions()).map(({ id }) => id)).not.toContain(
			inactiveManager.id
		);
		await expect(assignTeamManager(root.id, inactiveManager.id, actor)).rejects.toThrow(
			'active Person'
		);
		await assignTeamManager(root.id, activeManager.id, actor);
		await expect(assignTeamManager(child.id, activeManager.id, actor)).rejects.toThrow(
			'one reporting chain'
		);
		expect((await listEligibleParentOptions(root.id)).map(({ id }) => id)).not.toContain(child.id);
	});

	it('does not skip an unmanaged direct parent when deriving supervision', async () => {
		const owner = await trackedOrganization('Unmanaged Parent Owner');
		const root = await trackedTeam(owner.id, 'Root');
		const middle = await trackedTeam(owner.id, 'Middle');
		const leaf = await trackedTeam(owner.id, 'Leaf');
		const rootManager = await trackedPerson('Root Manager');
		const leafManager = await trackedPerson('Leaf Manager');
		await assignTeamParent(middle.id, root.id, actor);
		await assignTeamParent(leaf.id, middle.id, actor);
		await assignTeamManager(root.id, rootManager.id, actor);
		await assignTeamManager(leaf.id, leafManager.id, actor);

		expect((await getTeamHierarchyContext(leaf.id))?.supervisor).toBeNull();
	});
});
