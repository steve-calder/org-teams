import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/admin/authorization';
import { updatePerson } from '$lib/server/admin/people';
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
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Unable to update Person.'
			});
		}
	}
};
