<script lang="ts">
	import type { OrganizationChartTeam } from './model';
	import { flattenOrganizationForest, TEAM_TYPE_LABELS } from './layout';

	let {
		team,
		roots,
		onselect
	}: {
		team: OrganizationChartTeam | null;
		roots: OrganizationChartTeam[];
		onselect: (teamId: string) => void;
	} = $props();
	let parent = $derived(
		team?.parentTeamId
			? (flattenOrganizationForest(roots).find(({ id }) => id === team?.parentTeamId) ?? null)
			: null
	);
</script>

<aside
	class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
	aria-labelledby="team-details-heading"
>
	<h2 id="team-details-heading" class="text-lg font-semibold">Team details</h2>
	{#if team}
		<div class="mt-4 space-y-4 text-sm">
			<div>
				<p class="text-xl font-semibold text-slate-950">{team.name}</p>
				<p class="mt-1 text-slate-600">
					{TEAM_TYPE_LABELS[team.type]} · <span class="capitalize">{team.status}</span>
				</p>
			</div>
			<dl class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
				<div>
					<dt class="font-medium text-slate-700">Manager</dt>
					<dd class="text-slate-600">{team.manager?.displayName ?? 'No manager assigned'}</dd>
				</div>
				<div>
					<dt class="font-medium text-slate-700">Participants</dt>
					<dd class="text-slate-600">{team.participantCount}</dd>
				</div>
				<div>
					<dt class="font-medium text-slate-700">Parent Team</dt>
					<dd class="text-slate-600">
						{#if parent}<button
								type="button"
								class="font-medium text-teal-800 hover:underline focus:ring-2 focus:ring-teal-600 focus:outline-none"
								onclick={() => onselect(parent!.id)}>{parent.name}</button
							>{:else}Top-level Team{/if}
					</dd>
				</div>
				<div>
					<dt class="font-medium text-slate-700">Direct child Teams</dt>
					<dd class="text-slate-600">
						{#if team.children.length}
							<ul class="mt-1 space-y-1">
								{#each team.children as child (child.id)}
									<li>
										<button
											type="button"
											class="font-medium text-teal-800 hover:underline focus:ring-2 focus:ring-teal-600 focus:outline-none"
											onclick={() => onselect(child.id)}>{child.name}</button
										>
									</li>
								{/each}
							</ul>
						{:else}No direct child Teams{/if}
					</dd>
				</div>
			</dl>
		</div>
	{:else}
		<p class="mt-3 text-sm text-slate-600">Select a Team to inspect its hierarchy context.</p>
	{/if}
</aside>
