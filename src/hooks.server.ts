import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { ensurePersonForAuthUser } from '$lib/server/people/repository';
import { ensureDevAccount } from '$lib/server/dev-account';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	if (!building) await ensureDevAccount();

	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
		event.locals.person = await ensurePersonForAuthUser(session.user.id);
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
