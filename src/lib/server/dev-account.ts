import { dev } from '$app/environment';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';

export const DEV_CREDENTIALS = {
	email: 'dev@org-teams.local',
	password: 'password'
} as const;

let provisionAccount: Promise<void> | undefined;

export function ensureDevAccount(): Promise<void> {
	if (!dev) return Promise.resolve();

	provisionAccount ??= createDevAccount();
	return provisionAccount;
}

async function createDevAccount(): Promise<void> {
	try {
		await auth.api.signUpEmail({
			body: {
				name: 'Developer',
				email: DEV_CREDENTIALS.email,
				password: DEV_CREDENTIALS.password
			}
		});
	} catch (error) {
		if (
			error instanceof APIError &&
			error.status === 'UNPROCESSABLE_ENTITY' &&
			error.body?.message === 'User already exists. Use another email.'
		) {
			return;
		}

		throw error;
	}
}
