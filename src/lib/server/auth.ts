import { env } from '$env/dynamic/private';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { createAuthCore } from '$lib/server/auth-core';
import { db } from '$lib/server/db';
import { ensurePersonForAuthUser } from '$lib/server/people/repository';

export const auth = createAuthCore(
	{
		database: db,
		baseURL: env.ORIGIN,
		secret: env.BETTER_AUTH_SECRET,
		ensurePersonForAuthUser
	},
	[sveltekitCookies(getRequestEvent)] // The cookie plugin must remain last.
);
