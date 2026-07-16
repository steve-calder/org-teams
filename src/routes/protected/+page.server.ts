import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user || !locals.session || !locals.person) redirect(303, '/login');

	return {
		user: {
			name: locals.user.name,
			email: locals.user.email
		},
		person: {
			id: locals.person.id
		}
	};
};

export const actions: Actions = {
	logout: async (event) => {
		await auth.api.signOut({ headers: event.request.headers });
		redirect(303, '/login');
	}
};
