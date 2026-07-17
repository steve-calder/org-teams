import { error } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/admin/authorization';
import { listPersonAuditEvents } from '$lib/server/admin/audit';
import { getPersonAdminDetail } from '$lib/server/admin/people';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	const administrator = requireAdmin(locals);
	const detail = await getPersonAdminDetail(params.personId);
	if (!detail) error(404, 'Person not found.');
	return {
		...detail,
		administratorId: administrator.id,
		auditEvents: await listPersonAuditEvents(params.personId)
	};
};
