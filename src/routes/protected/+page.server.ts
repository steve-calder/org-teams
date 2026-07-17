import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

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
