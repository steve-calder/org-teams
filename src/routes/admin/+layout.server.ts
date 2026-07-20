import { requireAdmin } from '$lib/server/admin/authorization';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const administrator = requireAdmin(locals);
	return { administratorId: administrator.id };
};
