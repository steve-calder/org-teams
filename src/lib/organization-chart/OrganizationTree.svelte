<script lang="ts">
	import type { OrganizationChartTeam } from './model';
	import { findOrganizationTeam, TEAM_TYPE_LABELS } from './layout';

	let {
		roots,
		allRoots = roots,
		selectedTeamId,
		pivotTeamId,
		onselect,
		onpivot,
		organizationName = null,
		organizationExpanded = false,
		expandedTeamIds = new Set<string>(),
		ontoggleorganization = () => {},
		ontoggleteam = () => {}
	}: {
		roots: OrganizationChartTeam[];
		allRoots?: OrganizationChartTeam[];
		selectedTeamId: string | null;
		pivotTeamId: string | null;
		onselect: (teamId: string) => void;
		onpivot: (teamId: string) => void;
		organizationName?: string | null;
		organizationExpanded?: boolean;
		expandedTeamIds?: ReadonlySet<string>;
		ontoggleorganization?: () => void;
		ontoggleteam?: (teamId: string) => void;
	} = $props();
</script>

{#snippet treeNodes(nodes: OrganizationChartTeam[])}
	<ul class="ml-3 space-y-2 border-l border-slate-200 pl-4">
		{#each nodes as team (team.id)}
			{@const fullTeam = findOrganizationTeam(allRoots, team.id)}
			<li>
				<div
					class="rounded-lg border bg-white p-3 shadow-sm"
					class:border-teal-600={selectedTeamId === team.id}
					class:border-slate-200={selectedTeamId !== team.id}
				>
					<button
						type="button"
						aria-pressed={selectedTeamId === team.id}
						aria-label={`Inspect Team ${team.name}`}
						class="w-full rounded-md text-left focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:outline-none"
						onclick={() => onselect(team.id)}
					>
						<span class="flex flex-wrap items-baseline justify-between gap-2">
							<span class="font-semibold text-slate-950">{team.name}</span>
							<span class="text-xs text-slate-500 capitalize">{team.status}</span>
						</span>
						<span class="mt-1 block text-xs text-slate-600">
							{TEAM_TYPE_LABELS[team.type]} · {team.manager
								? `Managed by ${team.manager.displayName}`
								: 'No manager'} · {team.participantCount} participants
						</span>
					</button>
					<div class="mt-2 flex flex-wrap items-center gap-2">
						{#if pivotTeamId === team.id}
							<span
								class="rounded-md bg-slate-800 px-2 py-1 text-xs font-semibold text-white"
								aria-label={`${team.name} is the current pivot Team`}>Pivot Team</span
							>
						{:else}
							<button
								type="button"
								class="rounded-md border border-slate-400 px-2 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 focus:ring-2 focus:ring-slate-600 focus:outline-none"
								aria-label={`Pivot chart to this Team: ${team.name}`}
								onclick={() => onpivot(team.id)}>Pivot</button
							>
						{/if}
						{#if fullTeam?.children.length}
							<button
								type="button"
								class="mt-2 rounded-md border border-teal-300 px-2 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-50 focus:ring-2 focus:ring-teal-600 focus:outline-none"
								aria-expanded={expandedTeamIds.has(team.id)}
								onclick={() => ontoggleteam(team.id)}
							>
								{expandedTeamIds.has(team.id) ? 'Hide' : 'Show'} subordinate Teams ({fullTeam
									.children.length})
							</button>
						{/if}
					</div>
				</div>
				{#if team.children.length}{@render treeNodes(team.children)}{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<div aria-label="Organization Team hierarchy">
	{#if organizationName && allRoots.length}
		<div class="mb-3 rounded-lg border-2 border-teal-700 bg-teal-50 p-3">
			<p class="font-semibold text-slate-950">{organizationName}</p>
			<button
				type="button"
				class="mt-2 rounded-md border border-teal-300 bg-white px-2 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100 focus:ring-2 focus:ring-teal-600 focus:outline-none"
				aria-expanded={organizationExpanded}
				onclick={ontoggleorganization}
			>
				{organizationExpanded ? 'Hide' : 'Show'} top-level Teams ({allRoots.length})
			</button>
		</div>
	{/if}
	{@render treeNodes(roots)}
</div>
