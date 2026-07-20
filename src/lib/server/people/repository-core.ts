import { eq } from 'drizzle-orm';
import type { Database } from '$lib/server/db/factory';
import { person, type Person } from '$lib/server/db/person.schema';

export function createPersonRepository(database: Database) {
	async function findPersonByAuthUserId(authUserId: string): Promise<Person | undefined> {
		return database.query.person.findFirst({
			where: eq(person.authUserId, authUserId)
		});
	}

	async function ensurePersonForAuthUser(authUserId: string, displayName: string): Promise<Person> {
		const [created] = await database
			.insert(person)
			.values({ authUserId, displayName })
			.onConflictDoNothing({ target: person.authUserId })
			.returning();

		if (created) return created;

		const existing = await findPersonByAuthUserId(authUserId);
		if (!existing) {
			throw new Error('Unable to resolve the Person linked to the authenticated user');
		}

		return existing;
	}

	return { findPersonByAuthUserId, ensurePersonForAuthUser };
}
