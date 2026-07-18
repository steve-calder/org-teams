import { error, fail } from '@sveltejs/kit';
import { listTeamAuditEvents } from '$lib/server/admin/audit';
import { requireAdmin } from '$lib/server/admin/authorization';
import { listOrganizationOptions } from '$lib/server/admin/organizations';
import {
	assignTeamManager,
	assignTeamParent,
	getTeamHierarchyContext,
	listActiveManagerOptions,
	listEligibleParentOptions
} from '$lib/server/admin/team-hierarchy';
import {
	getTeamAdminDetail,
	TEAM_TYPE_OPTIONS,
	TeamDeactivationBlockedError,
	TeamTransferBlockedError,
	transferTeam,
	updateTeam
} from '$lib/server/admin/teams';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireAdmin(locals);
	const [detail, activeOrganizations, auditEvents, hierarchy, eligibleParents, managerOptions] =
		await Promise.all([
			getTeamAdminDetail(params.teamId),
			listOrganizationOptions('active'),
			listTeamAuditEvents(params.teamId),
			getTeamHierarchyContext(params.teamId),
			listEligibleParentOptions(params.teamId),
			listActiveManagerOptions()
		]);
	if (!detail) error(404, 'Team not found.');
	return {
		...detail,
		activeOrganizations,
		teamTypes: TEAM_TYPE_OPTIONS,
		auditEvents,
		hierarchy,
		eligibleParents,
		managerOptions
	};
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
		} catch (caught) {
			if (caught instanceof TeamDeactivationBlockedError) {
				return fail(409, {
					message: caught.message,
					blockingTeams: caught.blockingTeams,
					operation: 'status' as const
				});
			}
			return fail(400, {
				message: caught instanceof Error ? caught.message : 'Unable to change Team status.'
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
		} catch (caught) {
			if (caught instanceof TeamTransferBlockedError) {
				return fail(409, {
					message: caught.message,
					blockingTeams: caught.blockingTeams,
					operation: 'transfer' as const
				});
			}
			return fail(400, {
				message: caught instanceof Error ? caught.message : 'Unable to transfer Team.'
			});
		}
	},
	parent: async ({ locals, params, request }) => {
		const administrator = requireAdmin(locals);
		const formData = await request.formData();
		try {
			await assignTeamParent(
				params.teamId,
				formData.get('parentTeamId')?.toString() || null,
				administrator.id
			);
			return { success: true, operation: 'parent' as const };
		} catch (caught) {
			return fail(400, {
				message: caught instanceof Error ? caught.message : 'Unable to change parent Team.',
				operation: 'parent' as const
			});
		}
	},
	manager: async ({ locals, params, request }) => {
		const administrator = requireAdmin(locals);
		const formData = await request.formData();
		try {
			await assignTeamManager(
				params.teamId,
				formData.get('managerPersonId')?.toString() || null,
				administrator.id
			);
			return { success: true, operation: 'manager' as const };
		} catch (caught) {
			return fail(400, {
				message: caught instanceof Error ? caught.message : 'Unable to change Team manager.',
				operation: 'manager' as const
			});
		}
	}
};
