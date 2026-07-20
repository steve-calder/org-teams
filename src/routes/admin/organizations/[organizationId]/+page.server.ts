import { error, fail } from '@sveltejs/kit';
import { listOrganizationAuditEvents } from '$lib/server/admin/audit';
import { requireAdmin } from '$lib/server/admin/authorization';
import { listOrganizationTeamHierarchy } from '$lib/server/admin/team-hierarchy';
import {
	getOrganizationAdminDetail,
	OrganizationDeactivationBlockedError,
	updateOrganization
} from '$lib/server/admin/organizations';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireAdmin(locals);
	const detail = await getOrganizationAdminDetail(params.organizationId);
	if (!detail) error(404, 'Organization not found.');
	const [hierarchy, auditEvents] = await Promise.all([
		listOrganizationTeamHierarchy(params.organizationId),
		listOrganizationAuditEvents(params.organizationId)
	]);
	return {
		...detail,
		hierarchy,
		auditEvents
	};
};

export const actions: Actions = {
	update: async ({ locals, params, request }) => {
		const administrator = requireAdmin(locals);
		const formData = await request.formData();
		try {
			const detail = await getOrganizationAdminDetail(params.organizationId);
			if (!detail) error(404, 'Organization not found.');
			await updateOrganization(
				params.organizationId,
				{
					name: formData.get('name')?.toString() ?? '',
					description: formData.get('description')?.toString(),
					status: detail.organization.status
				},
				administrator.id
			);
			return { success: true, operation: 'update' as const };
		} catch (caught) {
			return fail(400, {
				message: caught instanceof Error ? caught.message : 'Unable to update Organization.',
				blockingTeams: [] as { id: string; name: string }[]
			});
		}
	},
	status: async ({ locals, params, request }) => {
		const administrator = requireAdmin(locals);
		const formData = await request.formData();
		try {
			const detail = await getOrganizationAdminDetail(params.organizationId);
			if (!detail) error(404, 'Organization not found.');
			await updateOrganization(
				params.organizationId,
				{
					name: detail.organization.name,
					description: detail.organization.description,
					status: formData.get('status') === 'inactive' ? 'inactive' : 'active'
				},
				administrator.id
			);
			return { success: true, operation: 'status' as const };
		} catch (caught) {
			if (caught instanceof OrganizationDeactivationBlockedError) {
				return fail(409, { message: caught.message, blockingTeams: caught.blockingTeams });
			}
			return fail(400, {
				message: caught instanceof Error ? caught.message : 'Unable to update Organization.',
				blockingTeams: [] as { id: string; name: string }[]
			});
		}
	}
};
