<script lang="ts">
	import { getContext } from 'svelte';
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';
	import {
		ORGANIZATION_CHART_DISCLOSURE,
		type OrganizationChartDisclosureContext
	} from './disclosure-context';
	import type { TeamFlowNode } from './layout';

	let {
		data,
		selected,
		targetPosition = Position.Top,
		sourcePosition = Position.Bottom
	}: NodeProps<TeamFlowNode> = $props();
	const disclosure = getContext<OrganizationChartDisclosureContext>(ORGANIZATION_CHART_DISCLOSURE);
</script>

<div
	class:border-teal-700={selected}
	class:ring-4={selected}
	class="h-[188px] w-[248px] rounded-xl border-2 border-slate-300 bg-white px-4 py-3 shadow-md ring-teal-100 transition"
>
	<Handle type="target" position={targetPosition} isConnectable={false} class="opacity-0" />
	<div class="flex items-start justify-between gap-2">
		<div class="min-w-0">
			<p class="truncate font-semibold text-slate-950" title={data.team.name}>{data.team.name}</p>
			<p class="mt-0.5 text-xs font-medium text-teal-700">{data.typeLabel}</p>
		</div>
		<span
			class="rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize"
			class:bg-emerald-100={data.team.status === 'active'}
			class:text-emerald-800={data.team.status === 'active'}
			class:bg-slate-200={data.team.status === 'inactive'}
			class:text-slate-700={data.team.status === 'inactive'}>{data.team.status}</span
		>
	</div>
	<div class="mt-3 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600">
		<p class="truncate" title={data.team.manager?.displayName ?? 'No manager'}>
			<span class="font-medium text-slate-700">Manager:</span>
			{data.team.manager?.displayName ?? 'None'}
		</p>
		<p>
			<span class="font-medium text-slate-700">Participants:</span>
			{data.team.participantCount}
		</p>
	</div>
	<div class="mt-2 flex flex-wrap items-center gap-1.5">
		{#if disclosure.isPivotTeam(data.team.id)}
			<span
				class="rounded-md bg-slate-800 px-2 py-1 text-xs font-semibold text-white"
				aria-label={`${data.team.name} is the current pivot Team`}>Pivot Team</span
			>
		{:else}
			<button
				type="button"
				class="nodrag nopan rounded-md border border-slate-400 px-2 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 focus:ring-2 focus:ring-slate-600 focus:outline-none"
				aria-label={`Pivot chart to this Team: ${data.team.name}`}
				onclick={(event) => {
					event.stopPropagation();
					disclosure.pivotTeam(data.team.id);
				}}>Pivot</button
			>
		{/if}
		{#if data.hasChildren}
			<button
				type="button"
				class="nodrag nopan rounded-md border border-teal-300 px-2 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-50 focus:ring-2 focus:ring-teal-600 focus:outline-none"
				aria-expanded={data.expanded}
				aria-label={`${data.expanded ? 'Hide' : 'Show'} subordinate Teams for ${data.team.name}`}
				onclick={(event) => {
					event.stopPropagation();
					disclosure.toggleTeam(data.team.id);
				}}
			>
				{data.expanded ? 'Hide' : 'Show'} subordinates ({data.directChildCount})
			</button>
		{/if}
	</div>
	<Handle type="source" position={sourcePosition} isConnectable={false} class="opacity-0" />
</div>
