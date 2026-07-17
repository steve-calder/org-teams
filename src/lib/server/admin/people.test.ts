import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { eq, inArray } from 'drizzle-orm';

const adminUpdateUser = vi.fn();

vi.mock('$lib/server/auth', () => ({
	auth: { api: { adminUpdateUser } }
}));

const { db } = await import('$lib/server/db');
const { adminAuditEvent, person, user } = await import('$lib/server/db/schema');
const { createPerson, listPeople, updatePerson } = await import('./people');
const { sanitizeAuditMetadata } = await import('./audit');

const personIds: string[] = [];
const userIds: string[] = [];

afterEach(async () => {
	adminUpdateUser.mockReset();
	if (personIds.length) {
		await db.delete(adminAuditEvent).where(inArray(adminAuditEvent.targetPersonId, personIds));
		await db.delete(person).where(inArray(person.id, personIds.splice(0)));
	}
	if (userIds.length) await db.delete(user).where(inArray(user.id, userIds.splice(0)));
});

async function createAuthUser(role = 'user', banned = false) {
	const id = randomUUID();
	userIds.push(id);
	await db.insert(user).values({
		id,
		name: 'Linked Person',
		email: `${id}@example.test`,
		role,
		banned
	});
	return id;
}

describe('Person administration services', () => {
	it('lists and filters linked and unlinked people with allowlisted authentication data', async () => {
		const linkedUserId = await createAuthUser('admin');
		const orphanedUserId = await createAuthUser();
		expect(orphanedUserId).toBeTruthy();
		const inserted = await db
			.insert(person)
			.values([
				{
					displayName: 'Alpha Linked',
					employeeIdentifier: `EMP-${randomUUID()}`,
					authUserId: linkedUserId
				},
				{ displayName: 'Beta No Login', status: 'inactive' }
			])
			.returning();
		personIds.push(...inserted.map(({ id }) => id));

		const all = await listPeople({ search: 'Alpha', admin: 'admin' });
		const unlinked = await listPeople({ login: 'none', status: 'inactive' });

		expect(all.people).toHaveLength(1);
		expect(all.people[0]).toMatchObject({
			person: { displayName: 'Alpha Linked' },
			auth: { id: linkedUserId, isAdmin: true, banned: false }
		});
		expect(JSON.stringify(all)).not.toMatch(/password|token|cookie/i);
		expect(all.orphanedAuthUsers).toBeGreaterThanOrEqual(1);
		expect(unlinked.people.some(({ person: row }) => row.displayName === 'Beta No Login')).toBe(
			true
		);
	});

	it('creates a person without login and records a sanitized audit event', async () => {
		const actorAuthUserId = randomUUID();
		const created = await createPerson(
			{
				displayName: '  Person Only  ',
				legalName: '',
				employeeIdentifier: `EMP-${randomUUID()}`,
				jobTitle: 'Analyst'
			},
			actorAuthUserId
		);
		personIds.push(created.id);

		const audit = await db.query.adminAuditEvent.findFirst({
			where: eq(adminAuditEvent.targetPersonId, created.id)
		});
		expect(created).toMatchObject({
			displayName: 'Person Only',
			authUserId: null,
			legalName: null,
			status: 'active'
		});
		expect(audit).toMatchObject({ actorAuthUserId, action: 'person.created' });
	});

	it('updates authoritative profile details and synchronizes a linked auth name', async () => {
		adminUpdateUser.mockResolvedValue({});
		const authUserId = await createAuthUser();
		const [created] = await db
			.insert(person)
			.values({ displayName: 'Old Name', authUserId })
			.returning();
		personIds.push(created.id);

		const updated = await updatePerson(
			created.id,
			{ displayName: 'New Name', status: 'inactive' },
			'actor-id',
			new Headers({ cookie: 'session=admin' })
		);

		expect(updated).toMatchObject({ displayName: 'New Name', status: 'inactive' });
		expect(adminUpdateUser).toHaveBeenCalledWith(
			expect.objectContaining({
				body: { userId: authUserId, data: { name: 'New Name' } }
			})
		);
	});

	it('rejects duplicate employee identifiers and strips secret audit metadata', async () => {
		const employeeIdentifier = `EMP-${randomUUID()}`;
		const first = await createPerson({ displayName: 'First', employeeIdentifier }, 'actor-id');
		personIds.push(first.id);

		await expect(
			createPerson({ displayName: 'Second', employeeIdentifier }, 'actor-id')
		).rejects.toThrow();
		expect(
			sanitizeAuditMetadata({
				email: 'safe@example.test',
				password: 'never-store',
				sessionToken: 'never-store',
				object: { nested: 'ignored' }
			})
		).toEqual({ email: 'safe@example.test' });
	});
});
