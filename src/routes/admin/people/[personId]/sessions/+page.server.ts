import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/admin/authorization';
import { getPersonAdminDetail } from '$lib/server/admin/people';
import {
	listPersonSessions,
	revokeAllPersonSessions,
	revokePersonSession
} from '$lib/server/admin/authentication';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, request }) => {
	const admin = requireAdmin(locals);
	const detail = await getPersonAdminDetail(params.personId);
	if (!detail?.auth) return { sessions: [] };
	return {
		sessions: await listPersonSessions(params.personId, {
			actorAuthUserId: admin.id,
			headers: request.headers
		})
	};
};

export const actions: Actions = {
	revoke: async ({ locals, params, request }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		try {
			await revokePersonSession(params.personId, form.get('sessionId')?.toString() ?? '', {
				actorAuthUserId: admin.id,
				headers: request.headers
			});
			return { success: 'Session revoked.' };
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Unable to revoke session.'
			});
		}
	},
	revokeAll: async ({ locals, params, request }) => {
		const admin = requireAdmin(locals);
		try {
			await revokeAllPersonSessions(params.personId, {
				actorAuthUserId: admin.id,
				headers: request.headers
			});
			return { success: 'All sessions revoked.' };
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Unable to revoke sessions.'
			});
		}
	}
};
