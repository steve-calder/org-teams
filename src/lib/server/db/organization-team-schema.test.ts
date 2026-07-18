import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { adminAuditEvent, organization, person, team } from '$lib/server/db/schema';

const organizationIds: string[] = [];
const teamIds: string[] = [];
const personIds: string[] = [];

afterEach(async () => {
	if (teamIds.length) {
		await db.delete(adminAuditEvent).where(inArray(adminAuditEvent.targetTeamId, teamIds));
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

async function createOrganization(name = 'Schema Organization') {
	const [created] = await db.insert(organization).values({ name }).returning();
	organizationIds.push(created.id);
	return created;
}

describe('Organization and Team schema', () => {
	it('stores defaults and permits duplicate display names', async () => {
		const first = await createOrganization('Duplicate Name');
		const second = await createOrganization('Duplicate Name');
		expect(first).toMatchObject({ name: 'Duplicate Name', status: 'active', description: null });
		expect(second.id).not.toBe(first.id);
	});

	it('enforces lengths, controlled Team types, and mandatory ownership', async () => {
		const owner = await createOrganization();
		await expect(db.insert(organization).values({ name: 'x'.repeat(161) })).rejects.toThrow();
		await expect(
			db
				.insert(team)
				.values({ organizationId: owner.id, name: 'Invalid type', type: 'unknown' as never })
		).rejects.toThrow();
		await expect(
			db.insert(team).values({ organizationId: null as never, name: 'No owner', type: 'other' })
		).rejects.toThrow();
	});

	it('restricts Organization deletion and validates audit domain targets', async () => {
		const owner = await createOrganization();
		const [createdTeam] = await db
			.insert(team)
			.values({ organizationId: owner.id, name: 'Owned Team', type: 'department' })
			.returning();
		teamIds.push(createdTeam.id);
		await expect(db.delete(organization).where(eq(organization.id, owner.id))).rejects.toThrow();
		await expect(
			db.insert(adminAuditEvent).values({
				actorAuthUserId: randomUUID(),
				targetOrganizationId: owner.id,
				targetTeamId: createdTeam.id,
				action: 'invalid.multi-target',
				metadata: {}
			})
		).rejects.toThrow();
	});

	it('stores nullable hierarchy relationships and exposes inferred relations', async () => {
		const owner = await createOrganization('Hierarchy Schema Organization');
		const [manager] = await db
			.insert(person)
			.values({ displayName: 'Hierarchy manager' })
			.returning();
		personIds.push(manager.id);
		const [parent] = await db
			.insert(team)
			.values({ organizationId: owner.id, name: 'Parent Team', type: 'department' })
			.returning();
		const [child] = await db
			.insert(team)
			.values({
				organizationId: owner.id,
				parentTeamId: parent.id,
				managerPersonId: manager.id,
				name: 'Child Team',
				type: 'functional'
			})
			.returning();
		teamIds.push(parent.id, child.id);

		expect(parent).toMatchObject({ parentTeamId: null, managerPersonId: null });
		expect(child).toMatchObject({ parentTeamId: parent.id, managerPersonId: manager.id });
		expect(
			await db.query.team.findFirst({
				where: eq(team.id, child.id),
				with: { parent: true, children: true, manager: true }
			})
		).toMatchObject({
			parent: { id: parent.id },
			children: [],
			manager: { id: manager.id }
		});
		await expect(db.delete(person).where(eq(person.id, manager.id))).rejects.toThrow();
	});

	it('commits a migration containing the ownership and integrity constraints', async () => {
		const migration = await readFile(
			'drizzle/0002_add-organization-team-administration.sql',
			'utf8'
		);
		expect(migration).toContain('CREATE TABLE "organization"');
		expect(migration).toContain('CREATE TABLE "team"');
		expect(migration).toContain('ON DELETE restrict');
		expect(migration).toContain('team_type_check');
		expect(migration).toContain('admin_audit_event_domain_target_check');
	});

	it('commits a nullable hierarchy migration with restrictive foreign keys and indexes', async () => {
		const migration = await readFile('drizzle/0003_add-team-hierarchy.sql', 'utf8');
		expect(migration).toContain('ADD COLUMN "parent_team_id" uuid');
		expect(migration).toContain('ADD COLUMN "manager_person_id" uuid');
		expect(migration).toContain('team_parent_team_id_team_id_fk');
		expect(migration).toContain('team_manager_person_id_person_id_fk');
		expect(migration).toContain('ON DELETE restrict ON UPDATE restrict');
		expect(migration).toContain('CREATE INDEX "team_parent_idx"');
		expect(migration).toContain('CREATE INDEX "team_manager_idx"');
		expect(migration).not.toMatch(/UPDATE "team"|SET "parent_team_id"|SET "manager_person_id"/);
	});
});
