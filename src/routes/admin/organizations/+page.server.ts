import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/admin/authorization';
import {
	createOrganization,
	listOrganizations,
	type OrganizationStatusFilter
} from '$lib/server/admin/organizations';
import type { Actions, PageServerLoad } from './$types';

function statusFilter(value: string | null): OrganizationStatusFilter {
	return value === 'active' || value === 'inactive' ? value : 'all';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	requireAdmin(locals);
	const page = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
	return listOrganizations({
		search: url.searchParams.get('search') ?? '',
		status: statusFilter(url.searchParams.get('status')),
		page: Number.isFinite(page) ? page : 1
	});
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const administrator = requireAdmin(locals);
		const formData = await request.formData();
		try {
			const created = await createOrganization(
				{
					name: formData.get('name')?.toString() ?? '',
					description: formData.get('description')?.toString()
				},
				administrator.id
			);
			return { success: true, createdOrganizationId: created.id };
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Unable to create Organization.'
			});
		}
	}
};
