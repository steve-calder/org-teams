import { betterAuth } from 'better-auth/minimal';
import type { BetterAuthPlugin } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import type { Person } from '$lib/server/db/person.schema';
import type { Database } from '$lib/server/db/factory';

export const MIN_PASSWORD_LENGTH = 8;

interface AuthCoreOptions {
	database: Database;
	baseURL?: string;
	secret?: string;
	ensurePersonForAuthUser: (authUserId: string, displayName: string) => Promise<Person>;
}

export function createAuthCore<const AdditionalPlugins extends BetterAuthPlugin[]>(
	options: AuthCoreOptions,
	additionalPlugins: AdditionalPlugins
) {
	return betterAuth({
		baseURL: options.baseURL,
		secret: options.secret,
		database: drizzleAdapter(options.database, { provider: 'pg' }),
		emailAndPassword: {
			enabled: true,
			minPasswordLength: MIN_PASSWORD_LENGTH,
			// Account provisioning must not create a session as a side effect.
			autoSignIn: false
		},
		databaseHooks: {
			user: {
				create: {
					after: async (user) => {
						await options.ensurePersonForAuthUser(user.id, user.name);
					}
				}
			}
		},
		plugins: [admin(), ...additionalPlugins]
	});
}
