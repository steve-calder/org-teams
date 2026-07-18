import { getPersonalDashboard } from '$lib/server/dashboard/personal';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || !locals.session || !locals.person) return { personalDashboard: null };
	return { personalDashboard: (await getPersonalDashboard(locals.person.id)) ?? null };
};
