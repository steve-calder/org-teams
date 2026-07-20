import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { count, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { person, user } from '$lib/server/db/schema';
import { ensurePersonForAuthUser } from './repository';

const authUserIds: string[] = [];

async function createAuthUser(): Promise<string> {
	const id = randomUUID();
	authUserIds.push(id);
	await db.insert(user).values({
		id,
		name: 'Repository test user',
		email: `${id}@example.test`
	});
	return id;
}

afterEach(async () => {
	for (const authUserId of authUserIds.splice(0)) {
		await db.delete(person).where(eq(person.authUserId, authUserId));
		await db.delete(user).where(eq(user.id, authUserId));
	}
});

describe('ensurePersonForAuthUser', () => {
	it('creates the initial Person for a preexisting authentication user', async () => {
		const authUserId = await createAuthUser();

		const created = await ensurePersonForAuthUser(authUserId, 'Repository test user');

		expect(created.authUserId).toBe(authUserId);
		expect(created.id).toBeTypeOf('string');
	});

	it('returns the persisted Person when provisioning is repeated', async () => {
		const authUserId = await createAuthUser();

		const first = await ensurePersonForAuthUser(authUserId, 'Repository test user');
		const second = await ensurePersonForAuthUser(authUserId, 'Repository test user');

		expect(second.id).toBe(first.id);
		const [result] = await db
			.select({ value: count() })
			.from(person)
			.where(eq(person.authUserId, authUserId));
		expect(result.value).toBe(1);
	});

	it('resolves concurrent provisioning to one Person', async () => {
		const authUserId = await createAuthUser();

		const [first, second] = await Promise.all([
			ensurePersonForAuthUser(authUserId, 'Repository test user'),
			ensurePersonForAuthUser(authUserId, 'Repository test user')
		]);

		expect(second.id).toBe(first.id);
	});

	it('rejects a duplicate authentication link', async () => {
		const authUserId = await createAuthUser();
		const existing = await ensurePersonForAuthUser(authUserId, 'Repository test user');

		await expect(
			db.insert(person).values({ authUserId, displayName: 'Duplicate Person' })
		).rejects.toThrow();
		expect(await ensurePersonForAuthUser(authUserId, 'Repository test user')).toMatchObject({
			id: existing.id
		});
	});
});
