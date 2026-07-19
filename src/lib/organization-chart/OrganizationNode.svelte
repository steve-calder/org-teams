<script lang="ts">
	import { getContext } from 'svelte';
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';
	import {
		ORGANIZATION_CHART_DISCLOSURE,
		type OrganizationChartDisclosureContext
	} from './disclosure-context';
	import type { OrganizationFlowNode } from './layout';

	let { data, sourcePosition = Position.Bottom }: NodeProps<OrganizationFlowNode> = $props();
	const disclosure = getContext<OrganizationChartDisclosureContext>(ORGANIZATION_CHART_DISCLOSURE);
</script>

<div
	class="h-[116px] w-56 rounded-xl border-2 border-teal-700 bg-teal-50 px-4 py-3 text-center shadow-md"
>
	<p class="text-xs font-semibold tracking-wide text-teal-700 uppercase">Organization</p>
	<p class="mt-1 truncate font-semibold text-slate-950" title={data.name}>{data.name}</p>
	<p class="mt-1 text-xs text-slate-600 capitalize">{data.status}</p>
	{#if data.hasChildren}
		<button
			type="button"
			class="nodrag nopan mt-2 rounded-md border border-teal-300 bg-white px-2 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100 focus:ring-2 focus:ring-teal-600 focus:outline-none"
			aria-expanded={data.expanded}
			aria-label={`${data.expanded ? 'Hide' : 'Show'} ${data.topLevelTeamCount} top-level Teams for ${data.name}`}
			onclick={(event) => {
				event.stopPropagation();
				disclosure.toggleOrganization();
			}}
		>
			{data.expanded ? 'Hide' : 'Show'} top-level Teams ({data.topLevelTeamCount})
		</button>
	{/if}
	<Handle type="source" position={sourcePosition} isConnectable={false} class="opacity-0" />
</div>
