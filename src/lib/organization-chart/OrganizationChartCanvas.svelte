<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteFlowProvider } from '@xyflow/svelte';
	import type { ChartProjection } from './layout';
	import OrganizationChartFlow from './OrganizationChartFlow.svelte';

	let {
		projection,
		selectedTeamId,
		pivotTeamId,
		onselect,
		onpivot,
		ontoggleorganization,
		ontoggleteam
	}: {
		projection: ChartProjection;
		selectedTeamId: string | null;
		pivotTeamId: string | null;
		onselect: (teamId: string) => void;
		onpivot: (teamId: string) => void;
		ontoggleorganization: () => void;
		ontoggleteam: (teamId: string) => void;
	} = $props();
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
</script>

{#if mounted}
	<SvelteFlowProvider>
		<OrganizationChartFlow
			{projection}
			{selectedTeamId}
			{pivotTeamId}
			{onselect}
			{onpivot}
			{ontoggleorganization}
			{ontoggleteam}
		/>
	</SvelteFlowProvider>
{:else}
	<div
		class="flex h-96 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600"
		role="status"
	>
		Interactive chart loading. The hierarchy tree remains available below.
	</div>
{/if}
