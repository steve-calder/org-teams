import { graphlib, layout as runDagreLayout } from '@dagrejs/dagre';
import { Position, type Edge, type Node } from '@xyflow/svelte';
import type { ChartTeamType, OrganizationChartSummary, OrganizationChartTeam } from './model';

export const ORGANIZATION_NODE_PREFIX = 'organization:';
export const TEAM_NODE_PREFIX = 'team:';
export const ORGANIZATION_NODE_SIZE = { width: 224, height: 116 } as const;
export const TEAM_NODE_SIZE = { width: 248, height: 188 } as const;

export type ChartDirection = 'TB' | 'LR';

export const TEAM_TYPE_LABELS: Record<ChartTeamType, string> = {
	department: 'Department',
	functional: 'Functional',
	product: 'Product',
	delivery: 'Delivery',
	project: 'Project',
	geographic: 'Geographic',
	committee: 'Committee',
	community: 'Community',
	other: 'Other'
};

export type OrganizationNodeData = {
	kind: 'organization';
	name: string;
	status: 'active' | 'inactive';
	hasChildren: boolean;
	expanded: boolean;
	topLevelTeamCount: number;
};

export type TeamNodeData = {
	kind: 'team';
	team: OrganizationChartTeam;
	typeLabel: string;
	hasChildren: boolean;
	expanded: boolean;
	directChildCount: number;
};

export type OrganizationFlowNode = Node<OrganizationNodeData, 'organization'>;
export type TeamFlowNode = Node<TeamNodeData, 'team'>;
export type ChartFlowNode = OrganizationFlowNode | TeamFlowNode;

export interface ChartProjection {
	nodes: ChartFlowNode[];
	edges: Edge[];
	/** Full lifecycle-filtered forest used by search and details. */
	visibleRoots: OrganizationChartTeam[];
	/** Progressively disclosed forest used by the chart and semantic tree. */
	revealedRoots: OrganizationChartTeam[];
	revealedTeamIds: string[];
	fitViewKey: string;
}

export interface ChartDisclosureState {
	focalTeamId: string | null;
	organizationExpanded: boolean;
	expandedTeamIds: ReadonlySet<string>;
}

const COLLAPSED_DISCLOSURE: ChartDisclosureState = {
	focalTeamId: null,
	organizationExpanded: false,
	expandedTeamIds: new Set()
};

const byNameAndId = (left: OrganizationChartTeam, right: OrganizationChartTeam) =>
	left.name.localeCompare(right.name) || left.id.localeCompare(right.id);

function cloneVisibleNode(
	node: OrganizationChartTeam,
	showInactive: boolean,
	ancestors: Set<string>
): OrganizationChartTeam | null {
	if (ancestors.has(node.id) || (!showInactive && node.status === 'inactive')) return null;
	const nextAncestors = new Set([...ancestors, node.id]);
	return {
		...node,
		children: node.children
			.map((child) => cloneVisibleNode(child, showInactive, nextAncestors))
			.filter((child): child is OrganizationChartTeam => child !== null)
			.sort(byNameAndId)
	};
}

export function visibleOrganizationForest(
	summary: OrganizationChartSummary,
	showInactive: boolean
): OrganizationChartTeam[] {
	return summary.roots
		.map((root) => cloneVisibleNode(root, showInactive, new Set()))
		.filter((root): root is OrganizationChartTeam => root !== null)
		.sort(byNameAndId);
}

export function flattenOrganizationForest(roots: OrganizationChartTeam[]) {
	const flattened: OrganizationChartTeam[] = [];
	const seen = new Set<string>();
	const visit = (node: OrganizationChartTeam) => {
		if (seen.has(node.id)) return;
		seen.add(node.id);
		flattened.push(node);
		for (const child of [...node.children].sort(byNameAndId)) visit(child);
	};
	for (const root of [...roots].sort(byNameAndId)) visit(root);
	return flattened;
}

export function searchOrganizationTeams(roots: OrganizationChartTeam[], query: string) {
	const normalized = query.trim().toLocaleLowerCase();
	if (!normalized) return [];
	return flattenOrganizationForest(roots)
		.filter(({ name }) => name.toLocaleLowerCase().includes(normalized))
		.sort(byNameAndId);
}

export function findOrganizationTeam(roots: OrganizationChartTeam[], teamId: string | null) {
	if (!teamId) return null;
	return flattenOrganizationForest(roots).find(({ id }) => id === teamId) ?? null;
}

export function normalizeSelectedTeamId(
	roots: OrganizationChartTeam[],
	teamId: string | null
): string | null {
	return findOrganizationTeam(roots, teamId)?.id ?? null;
}

export function focalTeamPath(roots: OrganizationChartTeam[], teamId: string | null) {
	if (!teamId) return [];
	const teams = flattenOrganizationForest(roots);
	const byId = new Map(teams.map((candidate) => [candidate.id, candidate]));
	const focalTeam = byId.get(teamId);
	if (!focalTeam) return [];

	const path: OrganizationChartTeam[] = [];
	const seen = new Set<string>();
	let current: OrganizationChartTeam | undefined = focalTeam;
	while (current && !seen.has(current.id)) {
		seen.add(current.id);
		path.unshift(current);
		current = current.parentTeamId ? byId.get(current.parentTeamId) : undefined;
	}
	return path;
}

export function collapseTeamExpansion(
	roots: OrganizationChartTeam[],
	expandedTeamIds: ReadonlySet<string>,
	teamId: string
) {
	const collapsedIds = new Set<string>();
	const selected = findOrganizationTeam(roots, teamId);
	if (selected) {
		const pending = [selected];
		while (pending.length) {
			const current = pending.shift()!;
			if (collapsedIds.has(current.id)) continue;
			collapsedIds.add(current.id);
			pending.push(...current.children);
		}
	} else {
		collapsedIds.add(teamId);
	}
	return new Set([...expandedTeamIds].filter((id) => !collapsedIds.has(id)));
}

function teamNodeId(teamId: string) {
	return `${TEAM_NODE_PREFIX}${teamId}`;
}

export function teamIdFromNodeId(nodeId: string) {
	return nodeId.startsWith(TEAM_NODE_PREFIX) ? nodeId.slice(TEAM_NODE_PREFIX.length) : null;
}

export function focusNodeIdsForTeam(projection: ChartProjection, teamId: string | null) {
	if (!teamId) return [];
	const selectedNodeId = teamNodeId(teamId);
	const nodeIds = new Set(projection.nodes.map(({ id }) => id));
	if (!nodeIds.has(selectedNodeId)) return [];

	const parentByTarget = new Map<string, string>();
	for (const edge of projection.edges) {
		if (!parentByTarget.has(edge.target)) parentByTarget.set(edge.target, edge.source);
	}

	const lineage: string[] = [];
	const seen = new Set<string>();
	let currentNodeId: string | undefined = selectedNodeId;
	while (currentNodeId && nodeIds.has(currentNodeId) && !seen.has(currentNodeId)) {
		seen.add(currentNodeId);
		lineage.unshift(currentNodeId);
		currentNodeId = parentByTarget.get(currentNodeId);
	}

	const directChildren = projection.edges
		.filter(
			({ source, target }) => source === selectedNodeId && nodeIds.has(target) && !seen.has(target)
		)
		.map(({ target }) => target);

	return [...lineage, ...directChildren];
}

export function buildOrganizationChartProjection(
	summary: OrganizationChartSummary,
	showInactive: boolean,
	direction: ChartDirection,
	disclosure: ChartDisclosureState = COLLAPSED_DISCLOSURE
): ChartProjection {
	const visibleRoots = visibleOrganizationForest(summary, showInactive);
	const teams = flattenOrganizationForest(visibleRoots);
	if (!teams.length) {
		return {
			nodes: [],
			edges: [],
			visibleRoots,
			revealedRoots: [],
			revealedTeamIds: [],
			fitViewKey: `${summary.organization.id}:${showInactive}:${direction}:empty`
		};
	}

	const focalPath = focalTeamPath(visibleRoots, disclosure.focalTeamId);
	const revealedIds = new Set(focalPath.map(({ id }) => id));
	if (disclosure.organizationExpanded) {
		for (const root of visibleRoots) revealedIds.add(root.id);
	}
	for (const candidate of teams) {
		if (!revealedIds.has(candidate.id) || !disclosure.expandedTeamIds.has(candidate.id)) {
			continue;
		}
		for (const child of candidate.children) revealedIds.add(child.id);
	}

	const cloneRevealed = (candidate: OrganizationChartTeam): OrganizationChartTeam | null => {
		if (!revealedIds.has(candidate.id)) return null;
		return {
			...candidate,
			children: candidate.children
				.map(cloneRevealed)
				.filter((child): child is OrganizationChartTeam => child !== null)
		};
	};
	const revealedRoots = visibleRoots
		.map(cloneRevealed)
		.filter((root): root is OrganizationChartTeam => root !== null);
	const revealedTeams = flattenOrganizationForest(revealedRoots);

	const organizationNodeId = `${ORGANIZATION_NODE_PREFIX}${summary.organization.id}`;
	const nodes: ChartFlowNode[] = [
		{
			id: organizationNodeId,
			type: 'organization',
			position: { x: 0, y: 0 },
			data: {
				kind: 'organization',
				name: summary.organization.name,
				status: summary.organization.status,
				hasChildren: visibleRoots.length > 0,
				expanded: disclosure.organizationExpanded,
				topLevelTeamCount: visibleRoots.length
			},
			draggable: false,
			connectable: false,
			selectable: false,
			focusable: false,
			ariaLabel: `Organization ${summary.organization.name}`
		},
		...revealedTeams.map((team): TeamFlowNode => ({
			id: teamNodeId(team.id),
			type: 'team',
			position: { x: 0, y: 0 },
			data: {
				kind: 'team',
				team,
				typeLabel: TEAM_TYPE_LABELS[team.type],
				hasChildren: (findOrganizationTeam(visibleRoots, team.id)?.children.length ?? 0) > 0,
				expanded: disclosure.expandedTeamIds.has(team.id),
				directChildCount: findOrganizationTeam(visibleRoots, team.id)?.children.length ?? 0
			},
			draggable: false,
			connectable: false,
			selectable: true,
			focusable: true,
			ariaLabel: `Inspect Team ${team.name}, ${TEAM_TYPE_LABELS[team.type]} Team, ${team.status}`
		}))
	];

	const edges: Edge[] = [];
	for (const root of revealedRoots) {
		edges.push({
			id: `edge:${organizationNodeId}:${teamNodeId(root.id)}`,
			source: organizationNodeId,
			target: teamNodeId(root.id),
			selectable: false,
			focusable: false,
			type: 'smoothstep'
		});
	}
	for (const parent of revealedTeams) {
		for (const child of parent.children) {
			edges.push({
				id: `edge:${teamNodeId(parent.id)}:${teamNodeId(child.id)}`,
				source: teamNodeId(parent.id),
				target: teamNodeId(child.id),
				selectable: false,
				focusable: false,
				type: 'smoothstep'
			});
		}
	}

	const graph = new graphlib.Graph().setDefaultEdgeLabel(() => ({}));
	graph.setGraph({
		rankdir: direction,
		ranksep: 120,
		nodesep: 36,
		marginx: 24,
		marginy: 24
	});
	for (const node of nodes) {
		const size = node.type === 'organization' ? ORGANIZATION_NODE_SIZE : TEAM_NODE_SIZE;
		graph.setNode(node.id, { ...size });
	}
	for (const edge of edges) graph.setEdge(edge.source, edge.target);
	runDagreLayout(graph);

	const horizontal = direction === 'LR';
	const positionedNodes = nodes.map((node): ChartFlowNode => {
		const size = node.type === 'organization' ? ORGANIZATION_NODE_SIZE : TEAM_NODE_SIZE;
		const position = graph.node(node.id) as { x: number; y: number };
		return {
			...node,
			position: { x: position.x - size.width / 2, y: position.y - size.height / 2 },
			targetPosition: horizontal ? Position.Left : Position.Top,
			sourcePosition: horizontal ? Position.Right : Position.Bottom
		};
	});

	return {
		nodes: positionedNodes,
		edges,
		visibleRoots,
		revealedRoots,
		revealedTeamIds: revealedTeams.map(({ id }) => id),
		fitViewKey: `${summary.organization.id}:${showInactive}:${direction}:${disclosure.focalTeamId ?? ''}:${disclosure.organizationExpanded}:${[...disclosure.expandedTeamIds].sort().join(',')}:${revealedTeams
			.map(({ id }) => id)
			.join(',')}`
	};
}
