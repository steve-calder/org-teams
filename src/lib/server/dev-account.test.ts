import { beforeAll, describe, expect, it } from 'vitest';
import { count, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { account, person, session, user } from '$lib/server/db/schema';
import { DEV_CREDENTIALS, ensureDevAccount } from './dev-account';

beforeAll(async () => {
	const existing = await db.query.user.findFirst({
		where: eq(user.email, DEV_CREDENTIALS.email)
	});
	if (!existing) return;

	await db.delete(person).where(eq(person.authUserId, existing.id));
	await db.delete(user).where(eq(user.id, existing.id));
});

describe('development account', () => {
	it('provisions one credential account and linked Person without a session', async () => {
		await ensureDevAccount();
		await ensureDevAccount();

		const devUser = await db.query.user.findFirst({
			where: eq(user.email, DEV_CREDENTIALS.email)
		});
		expect(devUser).toBeDefined();

		const [accountCount] = await db
			.select({ value: count() })
			.from(account)
			.where(eq(account.userId, devUser!.id));
		const [personCount] = await db
			.select({ value: count() })
			.from(person)
			.where(eq(person.authUserId, devUser!.id));
		const [sessionCount] = await db
			.select({ value: count() })
			.from(session)
			.where(eq(session.userId, devUser!.id));

		expect(accountCount.value).toBe(1);
		expect(personCount.value).toBe(1);
		expect(sessionCount.value).toBe(0);
	});
});
