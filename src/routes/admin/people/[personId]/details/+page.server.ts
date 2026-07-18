import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/admin/authorization';
import { PersonDeactivationBlockedError, updatePerson } from '$lib/server/admin/people';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ locals, params, request }) => {
		const administrator = requireAdmin(locals);
		const formData = await request.formData();
		try {
			await updatePerson(
				params.personId,
				{
					displayName: formData.get('displayName')?.toString() ?? '',
					legalName: formData.get('legalName')?.toString(),
					employeeIdentifier: formData.get('employeeIdentifier')?.toString(),
					jobTitle: formData.get('jobTitle')?.toString(),
					status: formData.get('status') === 'inactive' ? 'inactive' : 'active'
				},
				administrator.id,
				request.headers
			);
			return { success: true };
		} catch (caught) {
			if (caught instanceof PersonDeactivationBlockedError) {
				return fail(409, {
					message: caught.message,
					blockingTeams: caught.blockingTeams
				});
			}
			return fail(400, {
				message: caught instanceof Error ? caught.message : 'Unable to update Person.',
				blockingTeams: [] as { id: string; name: string }[]
			});
		}
	}
};
