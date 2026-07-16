import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { person, type Person } from '$lib/server/db/person.schema';

export async function findPersonByAuthUserId(authUserId: string): Promise<Person | undefined> {
	return db.query.person.findFirst({
		where: eq(person.authUserId, authUserId)
	});
}

export async function ensurePersonForAuthUser(authUserId: string): Promise<Person> {
	const [created] = await db
		.insert(person)
		.values({ authUserId })
		.onConflictDoNothing({ target: person.authUserId })
		.returning();

	if (created) return created;

	const existing = await findPersonByAuthUserId(authUserId);
	if (!existing) {
		throw new Error('Unable to resolve the Person linked to the authenticated user');
	}

	return existing;
}
