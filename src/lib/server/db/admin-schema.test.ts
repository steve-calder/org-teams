import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { adminAuditEvent, person, user } from '$lib/server/db/schema';

const personIds: string[] = [];
const userIds: string[] = [];

afterEach(async () => {
	for (const id of personIds.splice(0)) {
		await db.delete(adminAuditEvent).where(eq(adminAuditEvent.targetPersonId, id));
		await db.delete(person).where(eq(person.id, id));
	}
	for (const id of userIds.splice(0)) {
		await db.delete(user).where(eq(user.id, id));
	}
});

describe('admin and Person schema', () => {
	it('stores Person profile defaults without requiring login', async () => {
		const [created] = await db
			.insert(person)
			.values({ displayName: 'Person without login' })
			.returning();
		personIds.push(created.id);

		expect(created).toMatchObject({
			displayName: 'Person without login',
			authUserId: null,
			legalName: null,
			employeeIdentifier: null,
			jobTitle: null,
			status: 'active'
		});
	});

	it('enforces unique employee identifiers', async () => {
		const employeeIdentifier = `EMP-${randomUUID()}`;
		const [first] = await db
			.insert(person)
			.values({ displayName: 'First Person', employeeIdentifier })
			.returning();
		personIds.push(first.id);

		await expect(
			db.insert(person).values({ displayName: 'Second Person', employeeIdentifier })
		).rejects.toThrow();
	});

	it('stores generated Better Auth admin fields and relates sanitized audit events', async () => {
		const authUserId = randomUUID();
		userIds.push(authUserId);
		await db.insert(user).values({
			id: authUserId,
			name: 'Schema administrator',
			email: `${authUserId}@example.test`,
			role: 'admin',
			banned: false
		});
		const [targetPerson] = await db
			.insert(person)
			.values({ displayName: 'Audit target', authUserId })
			.returning();
		personIds.push(targetPerson.id);

		await db.insert(adminAuditEvent).values({
			actorAuthUserId: authUserId,
			targetPersonId: targetPerson.id,
			targetAuthUserId: authUserId,
			action: 'person.created',
			metadata: { field: 'displayName' }
		});

		const storedUser = await db.query.user.findFirst({ where: eq(user.id, authUserId) });
		const storedAudit = await db.query.adminAuditEvent.findFirst({
			where: eq(adminAuditEvent.targetPersonId, targetPerson.id),
			with: { targetPerson: true }
		});

		expect(storedUser).toMatchObject({ role: 'admin', banned: false });
		expect(storedAudit).toMatchObject({
			action: 'person.created',
			metadata: { field: 'displayName' },
			targetPerson: { id: targetPerson.id }
		});
		expect(JSON.stringify(storedAudit)).not.toMatch(/password|token|cookie/i);
	});

	it('backfills display names before the migration enforces the required column', async () => {
		const migration = await readFile('drizzle/0001_funny_the_fury.sql', 'utf8');
		const backfillPosition = migration.indexOf('SET "display_name" = "user"."name"');
		const requiredPosition = migration.indexOf('ALTER COLUMN "display_name" SET NOT NULL');

		expect(backfillPosition).toBeGreaterThan(-1);
		expect(requiredPosition).toBeGreaterThan(backfillPosition);
	});
});
