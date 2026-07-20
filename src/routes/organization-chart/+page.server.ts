import { redirect } from '@sveltejs/kit';
import {
	getDefaultOrganizationChartSelection,
	getOrganizationChart,
	listOrganizationChartOptions
} from '$lib/server/organization-chart';
import type { OrganizationChartTeam } from '$lib/organization-chart/model';
import type { PageServerLoad } from './$types';

function containsTeam(roots: OrganizationChartTeam[], teamId: string) {
	const pending = [...roots];
	const seen = new Set<string>();
	while (pending.length) {
		const current = pending.shift()!;
		if (current.id === teamId) return true;
		if (seen.has(current.id)) continue;
		seen.add(current.id);
		pending.push(...current.children);
	}
	return false;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user || !locals.session) redirect(303, '/login');

	const organizations = await listOrganizationChartOptions();
	const requestedOrganizationId = url.searchParams.get('organizationId');
	const requestedOrganization = organizations.find(({ id }) => id === requestedOrganizationId);
	const defaultSelection = requestedOrganization
		? null
		: await getDefaultOrganizationChartSelection(locals.user.id);
	const selectedOrganization = requestedOrganization
		? requestedOrganization
		: (organizations.find(({ id }) => id === defaultSelection?.organizationId) ??
			organizations[0] ??
			null);
	const chart = selectedOrganization
		? await getOrganizationChart(selectedOrganization.id)
		: undefined;
	const requestedTeamId = requestedOrganization
		? url.searchParams.get('teamId')
		: defaultSelection?.teamId;
	const selectedTeamId =
		chart && requestedTeamId && containsTeam(chart.roots, requestedTeamId) ? requestedTeamId : null;

	return {
		organizations,
		selectedOrganizationId: selectedOrganization?.id ?? null,
		selectedTeamId,
		chart: chart ?? null
	};
};
