import { error, fail } from '@sveltejs/kit';
import { listTeamAuditEvents } from '$lib/server/admin/audit';
import { requireAdmin } from '$lib/server/admin/authorization';
import { listOrganizationOptions } from '$lib/server/admin/organizations';
import {
	getTeamAdminDetail,
	TEAM_TYPE_OPTIONS,
	transferTeam,
	updateTeam
} from '$lib/server/admin/teams';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireAdmin(locals);
	const [detail, activeOrganizations, auditEvents] = await Promise.all([
		getTeamAdminDetail(params.teamId),
		listOrganizationOptions('active'),
		listTeamAuditEvents(params.teamId)
	]);
	if (!detail) error(404, 'Team not found.');
	return { ...detail, activeOrganizations, teamTypes: TEAM_TYPE_OPTIONS, auditEvents };
};

export const actions: Actions = {
	update: async ({ locals, params, request }) => {
		const administrator = requireAdmin(locals);
		const formData = await request.formData();
		try {
			const detail = await getTeamAdminDetail(params.teamId);
			if (!detail) error(404, 'Team not found.');
			await updateTeam(
				params.teamId,
				{
					name: formData.get('name')?.toString() ?? '',
					purpose: formData.get('purpose')?.toString(),
					type: formData.get('type')?.toString() ?? '',
					status: detail.team.status
				},
				administrator.id
			);
			return { success: true, operation: 'update' as const };
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Unable to update Team.'
			});
		}
	},
	status: async ({ locals, params, request }) => {
		const administrator = requireAdmin(locals);
		const formData = await request.formData();
		try {
			const detail = await getTeamAdminDetail(params.teamId);
			if (!detail) error(404, 'Team not found.');
			await updateTeam(
				params.teamId,
				{
					name: detail.team.name,
					purpose: detail.team.purpose,
					type: detail.team.type,
					status: formData.get('status') === 'inactive' ? 'inactive' : 'active'
				},
				administrator.id
			);
			return { success: true, operation: 'status' as const };
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Unable to change Team status.'
			});
		}
	},
	transfer: async ({ locals, params, request }) => {
		const administrator = requireAdmin(locals);
		const formData = await request.formData();
		try {
			await transferTeam(
				params.teamId,
				formData.get('destinationOrganizationId')?.toString() ?? '',
				formData.get('confirmation') === 'TRANSFER',
				administrator.id
			);
			return { success: true, operation: 'transfer' as const };
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Unable to transfer Team.'
			});
		}
	}
};
