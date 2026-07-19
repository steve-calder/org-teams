<script lang="ts">
	import { setContext, tick } from 'svelte';
	import {
		Background,
		BackgroundVariant,
		Controls,
		MiniMap,
		SvelteFlow,
		useSvelteFlow,
		type NodeTypes
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import { ORGANIZATION_CHART_DISCLOSURE } from './disclosure-context';
	import type { ChartProjection } from './layout';
	import { TEAM_NODE_PREFIX, teamIdFromNodeId } from './layout';
	import OrganizationNode from './OrganizationNode.svelte';
	import TeamNode from './TeamNode.svelte';

	let {
		projection,
		selectedTeamId,
		onselect,
		ontoggleorganization,
		ontoggleteam
	}: {
		projection: ChartProjection;
		selectedTeamId: string | null;
		onselect: (teamId: string) => void;
		ontoggleorganization: () => void;
		ontoggleteam: (teamId: string) => void;
	} = $props();
	setContext(ORGANIZATION_CHART_DISCLOSURE, {
		toggleOrganization: () => ontoggleorganization(),
		toggleTeam: (teamId: string) => ontoggleteam(teamId)
	});

	const nodeTypes: NodeTypes = { organization: OrganizationNode, team: TeamNode };
	const { fitView } = useSvelteFlow();
	let previousFocusKey = '';
	let nodes = $derived(
		projection.nodes.map((node) => ({
			...node,
			selected: node.id === `${TEAM_NODE_PREFIX}${selectedTeamId}`
		}))
	);
	$effect(() => {
		const focusKey = selectedTeamId
			? `${projection.fitViewKey}:${selectedTeamId}`
			: projection.fitViewKey;
		if (focusKey === previousFocusKey) return;
		previousFocusKey = focusKey;
		void tick().then(() =>
			fitView({
				padding: 0.2,
				maxZoom: 1,
				duration: 250,
				nodes: projection.nodes.map(({ id }) => ({ id }))
			})
		);
	});
</script>

<div
	class="h-[34rem] min-h-96 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
	aria-label="Read-only Organization chart"
>
	<SvelteFlow
		{nodes}
		edges={projection.edges}
		{nodeTypes}
		fitView
		fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
		nodesDraggable={false}
		nodesConnectable={false}
		edgesFocusable={false}
		deleteKey={null}
		selectionKey={null}
		multiSelectionKey={null}
		minZoom={0.15}
		maxZoom={1.5}
		autoPanOnNodeFocus
		onnodeclick={({ node }) => {
			const teamId = teamIdFromNodeId(node.id);
			if (teamId) onselect(teamId);
		}}
	>
		<Controls showLock={false} aria-label="Chart viewport controls" />
		{#if projection.nodes.length > 18}<MiniMap pannable zoomable aria-label="Chart minimap" />{/if}
		<Background variant={BackgroundVariant.Dots} gap={20} size={1} patternColor="#cbd5e1" />
	</SvelteFlow>
</div>
