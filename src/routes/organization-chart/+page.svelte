<script lang="ts">
	import { browser } from '$app/environment';
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import OrganizationChartCanvas from '$lib/organization-chart/OrganizationChartCanvas.svelte';
	import OrganizationTree from '$lib/organization-chart/OrganizationTree.svelte';
	import TeamDetails from '$lib/organization-chart/TeamDetails.svelte';
	import {
		buildOrganizationChartProjection,
		collapseTeamExpansion,
		findOrganizationTeam,
		normalizeSelectedTeamId,
		searchOrganizationTeams,
		type ChartDirection
	} from '$lib/organization-chart/layout';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let view = $state<'chart' | 'tree'>('chart');
	let direction = $state<ChartDirection>('TB');
	let showInactive = $state(true);
	let search = $state('');
	let pivotTeamId = $state<string | null>(null);
	let selectedTeamId = $state<string | null>(null);
	let organizationExpanded = $state(false);
	let expandedTeamIds = $state<Set<string>>(new Set());
	let previousServerSelectionKey = '';
	let projection = $derived(
		data.chart
			? buildOrganizationChartProjection(data.chart, showInactive, direction, {
					focalTeamId: pivotTeamId,
					organizationExpanded,
					expandedTeamIds
				})
			: null
	);
	let selectedTeam = $derived(
		projection ? findOrganizationTeam(projection.visibleRoots, selectedTeamId) : null
	);
	let searchResults = $derived(
		projection ? searchOrganizationTeams(projection.visibleRoots, search) : []
	);

	$effect(() => {
		const serverSelectionKey = `${data.selectedOrganizationId ?? ''}:${data.selectedTeamId ?? ''}`;
		if (serverSelectionKey !== previousServerSelectionKey) {
			previousServerSelectionKey = serverSelectionKey;
			pivotTeamId = data.selectedTeamId;
			selectedTeamId = data.selectedTeamId;
			organizationExpanded = false;
			expandedTeamIds = new Set();
		}
	});

	$effect(() => {
		if (!projection) {
			pivotTeamId = null;
			selectedTeamId = null;
			return;
		}
		const normalizedPivotTeamId = normalizeSelectedTeamId(projection.visibleRoots, pivotTeamId);
		if (normalizedPivotTeamId !== pivotTeamId) {
			pivotTeamId = normalizedPivotTeamId;
			selectedTeamId = normalizedPivotTeamId;
			organizationExpanded = false;
			expandedTeamIds = new Set();
			updateSelectionUrl(normalizedPivotTeamId);
			return;
		}
		const normalizedSelectedTeamId = normalizeSelectedTeamId(
			projection.revealedRoots,
			selectedTeamId
		);
		if (normalizedSelectedTeamId !== selectedTeamId) {
			selectedTeamId = normalizedSelectedTeamId;
		}
	});

	function selectTeam(teamId: string) {
		if (teamId === selectedTeamId) return;
		selectedTeamId = teamId;
	}

	function pivotTeam(teamId: string) {
		if (teamId === pivotTeamId) return;
		pivotTeamId = teamId;
		selectedTeamId = teamId;
		organizationExpanded = false;
		expandedTeamIds = new Set();
		updateSelectionUrl(teamId);
	}

	function toggleOrganization() {
		organizationExpanded = !organizationExpanded;
	}

	function toggleTeam(teamId: string) {
		if (!projection) return;
		if (expandedTeamIds.has(teamId)) {
			expandedTeamIds = collapseTeamExpansion(projection.visibleRoots, expandedTeamIds, teamId);
			return;
		}
		expandedTeamIds = new Set([...expandedTeamIds, teamId]);
	}

	function organizationUrl(organizationId: string) {
		const params = new SvelteURLSearchParams({ organizationId });
		return `${resolve('/organization-chart')}?${params}`;
	}

	function updateSelectionUrl(teamId: string | null) {
		if (!browser || !data.selectedOrganizationId) return;
		const params = new SvelteURLSearchParams({ organizationId: data.selectedOrganizationId });
		if (teamId) params.set('teamId', teamId);
		// The query string is appended to a route resolved for the configured base path.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		replaceState(`${resolve('/organization-chart')}?${params}`, {});
	}
</script>

<svelte:head><title>Organization Chart | Org Teams</title></svelte:head>

<section aria-labelledby="organization-chart-heading" class="space-y-6">
	<header>
		<p class="text-sm font-semibold tracking-wide text-teal-700 uppercase">Explore</p>
		<h1 id="organization-chart-heading" class="mt-1 text-3xl font-semibold tracking-tight">
			Organization chart
		</h1>
		<p class="mt-2 max-w-3xl text-slate-600">
			Explore Team structures across Organizations. This is a read-only view.
		</p>
	</header>

	{#if data.organizations.length}
		<section
			aria-label="Chart controls"
			class="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(12rem,1fr)_minmax(14rem,1fr)_auto]"
		>
			<label>
				<span class="block text-sm font-medium">Organization</span>
				<select
					aria-label="Organization"
					value={data.selectedOrganizationId ?? ''}
					class="mt-1 w-full rounded-md border-slate-300"
					onchange={(event) => {
						if (browser) window.location.assign(organizationUrl(event.currentTarget.value));
					}}
				>
					{#each data.organizations as organization (organization.id)}
						<option value={organization.id}>
							{organization.name}{organization.status === 'inactive' ? ' (inactive)' : ''}
						</option>
					{/each}
				</select>
			</label>

			<div class="relative">
				<label for="team-search" class="block text-sm font-medium">Find a Team</label>
				<input
					id="team-search"
					value={search}
					oninput={(event) => (search = event.currentTarget.value)}
					placeholder="Search by Team name"
					class="mt-1 w-full rounded-md border-slate-300"
				/>
				{#if search.trim()}
					<div
						class="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg"
						aria-live="polite"
					>
						{#if searchResults.length}
							{#each searchResults as result (result.id)}
								<button
									type="button"
									class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-teal-50 focus:bg-teal-50 focus:outline-none"
									onclick={() => {
										pivotTeam(result.id);
										search = '';
									}}>{result.name}</button
								>
							{/each}
						{:else}
							<p class="px-3 py-2 text-sm text-slate-600">No Teams match this search.</p>
						{/if}
					</div>
				{/if}
			</div>

			<label class="flex min-h-11 items-center gap-2 self-end text-sm font-medium">
				<input
					type="checkbox"
					checked={showInactive}
					onchange={(event) => (showInactive = event.currentTarget.checked)}
					class="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
				/>
				Show inactive Teams
			</label>
		</section>

		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="inline-flex rounded-lg border border-slate-300 bg-white p-1" aria-label="View">
				<button
					type="button"
					aria-pressed={view === 'chart'}
					class="rounded-md px-4 py-2 text-sm font-semibold"
					class:bg-teal-700={view === 'chart'}
					class:text-white={view === 'chart'}
					onclick={() => (view = 'chart')}>Chart</button
				>
				<button
					type="button"
					aria-pressed={view === 'tree'}
					class="rounded-md px-4 py-2 text-sm font-semibold"
					class:bg-teal-700={view === 'tree'}
					class:text-white={view === 'tree'}
					onclick={() => (view = 'tree')}>Tree</button
				>
			</div>
			{#if view === 'chart'}
				<div
					class="inline-flex rounded-lg border border-slate-300 bg-white p-1"
					aria-label="Chart orientation"
				>
					<button
						type="button"
						aria-pressed={direction === 'TB'}
						class="rounded-md px-3 py-2 text-sm font-semibold"
						class:bg-slate-800={direction === 'TB'}
						class:text-white={direction === 'TB'}
						onclick={() => (direction = 'TB')}>Top to bottom</button
					>
					<button
						type="button"
						aria-pressed={direction === 'LR'}
						class="rounded-md px-3 py-2 text-sm font-semibold"
						class:bg-slate-800={direction === 'LR'}
						class:text-white={direction === 'LR'}
						onclick={() => (direction = 'LR')}>Left to right</button
					>
				</div>
			{/if}
		</div>

		{#if data.chart?.hasIntegrityIssue}
			<p class="rounded-md bg-amber-50 p-3 text-sm text-amber-900" role="alert">
				Some Team relationships could not be placed normally.
			</p>
		{/if}

		{#if projection?.nodes.length}
			<div class="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
				<div class="min-w-0">
					{#if view === 'chart'}
						<OrganizationChartCanvas
							{projection}
							{selectedTeamId}
							{pivotTeamId}
							onselect={selectTeam}
							onpivot={pivotTeam}
							ontoggleorganization={toggleOrganization}
							ontoggleteam={toggleTeam}
						/>
					{:else}
						<section
							aria-labelledby="tree-view-heading"
							class="rounded-xl border border-slate-200 bg-slate-50 p-5"
						>
							<h2 id="tree-view-heading" class="text-lg font-semibold">Team hierarchy tree</h2>
							<div class="mt-4">
								<OrganizationTree
									roots={projection.revealedRoots}
									allRoots={projection.visibleRoots}
									{selectedTeamId}
									{pivotTeamId}
									onselect={selectTeam}
									onpivot={pivotTeam}
									organizationName={data.chart?.organization.name}
									{organizationExpanded}
									{expandedTeamIds}
									ontoggleorganization={toggleOrganization}
									ontoggleteam={toggleTeam}
								/>
							</div>
						</section>
					{/if}
				</div>
				<TeamDetails team={selectedTeam} roots={projection.visibleRoots} onselect={selectTeam} />
			</div>
		{:else}
			<p class="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
				{data.chart?.total
					? 'No Teams are displayed with the current lifecycle filter.'
					: 'No Teams belong to this Organization.'}
			</p>
		{/if}
	{:else}
		<p class="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
			No Organizations are available yet.
		</p>
	{/if}
</section>
