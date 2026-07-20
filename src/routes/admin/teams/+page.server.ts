import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/admin/authorization';
import { listOrganizationOptions } from '$lib/server/admin/organizations';
import {
	createTeam,
	isTeamType,
	listTeams,
	TEAM_TYPE_OPTIONS,
	type TeamStatusFilter,
	type TeamTypeFilter
} from '$lib/server/admin/teams';
import type { Actions, PageServerLoad } from './$types';

function statusFilter(value: string | null): TeamStatusFilter {
	return value === 'active' || value === 'inactive' ? value : 'all';
}

function typeFilter(value: string | null): TeamTypeFilter {
	return isTeamType(value) ? value : 'all';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	requireAdmin(locals);
	const page = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
	const [directory, organizations] = await Promise.all([
		listTeams({
			search: url.searchParams.get('search') ?? '',
			organizationId: url.searchParams.get('organizationId') ?? '',
			type: typeFilter(url.searchParams.get('type')),
			status: statusFilter(url.searchParams.get('status')),
			page: Number.isFinite(page) ? page : 1
		}),
		listOrganizationOptions()
	]);
	return { ...directory, organizations, teamTypes: TEAM_TYPE_OPTIONS };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const administrator = requireAdmin(locals);
		const formData = await request.formData();
		try {
			const created = await createTeam(
				{
					organizationId: formData.get('organizationId')?.toString() ?? '',
					name: formData.get('name')?.toString() ?? '',
					purpose: formData.get('purpose')?.toString(),
					type: formData.get('type')?.toString() ?? '',
					status: formData.get('status') === 'inactive' ? 'inactive' : 'active'
				},
				administrator.id
			);
			return { success: true, createdTeamId: created.id };
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Unable to create Team.'
			});
		}
	}
};
