import { error, fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/admin/authorization';
import {
	createTeamMembership,
	getPersonMembershipAdminContext,
	removeTeamMembership,
	updateTeamMembershipRole
} from '$lib/server/admin/team-memberships';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireAdmin(locals);
	const membershipContext = await getPersonMembershipAdminContext(params.personId);
	if (!membershipContext) error(404, 'Person not found.');
	return { membershipContext };
};

export const actions: Actions = {
	create: async ({ locals, params, request }) => {
		const administrator = requireAdmin(locals);
		const formData = await request.formData();
		try {
			await createTeamMembership(
				params.personId,
				formData.get('teamId')?.toString() ?? '',
				formData.get('role')?.toString() ?? '',
				administrator.id
			);
			return { success: true, operation: 'create' as const };
		} catch (caught) {
			return fail(400, {
				message: caught instanceof Error ? caught.message : 'Unable to assign Team.',
				operation: 'create' as const
			});
		}
	},
	role: async ({ locals, params, request }) => {
		const administrator = requireAdmin(locals);
		const formData = await request.formData();
		try {
			await updateTeamMembershipRole(
				formData.get('membershipId')?.toString() ?? '',
				formData.get('role')?.toString() ?? '',
				administrator.id,
				{ personId: params.personId }
			);
			return { success: true, operation: 'role' as const };
		} catch (caught) {
			return fail(400, {
				message: caught instanceof Error ? caught.message : 'Unable to update Team role.',
				operation: 'role' as const
			});
		}
	},
	remove: async ({ locals, params, request }) => {
		const administrator = requireAdmin(locals);
		const formData = await request.formData();
		try {
			await removeTeamMembership(formData.get('membershipId')?.toString() ?? '', administrator.id, {
				personId: params.personId
			});
			return { success: true, operation: 'remove' as const };
		} catch (caught) {
			return fail(400, {
				message: caught instanceof Error ? caught.message : 'Unable to remove Team.',
				operation: 'remove' as const
			});
		}
	}
};
