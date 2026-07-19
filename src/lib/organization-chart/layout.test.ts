import { describe, expect, it } from 'vitest';
import type { OrganizationChartSummary, OrganizationChartTeam } from './model';
import {
	buildOrganizationChartProjection,
	collapseTeamExpansion,
	findOrganizationTeam,
	flattenOrganizationForest,
	focalTeamPath,
	focusNodeIdsForTeam,
	normalizeSelectedTeamId,
	searchOrganizationTeams,
	teamIdFromNodeId,
	visibleOrganizationForest
} from './layout';

const team = (
	id: string,
	name: string,
	children: OrganizationChartTeam[] = [],
	status: 'active' | 'inactive' = 'active'
): OrganizationChartTeam => ({
	id,
	name,
	type: 'functional',
	status,
	parentTeamId: null,
	manager: null,
	ordinaryMembershipCount: 0,
	participantCount: 0,
	children
});

const summary = (roots: OrganizationChartTeam[]): OrganizationChartSummary => ({
	organization: { id: 'org-1', name: 'Example Organization', status: 'active' },
	roots,
	total: flattenOrganizationForest(roots).length,
	hasIntegrityIssue: false
});

describe('organization chart projection', () => {
	it('flattens stable roots and preserves search context', () => {
		const child = team('child', 'Platform');
		child.parentTeamId = 'alpha';
		const roots = [team('beta', 'Beta'), team('alpha', 'Alpha', [child])];

		expect(flattenOrganizationForest(roots).map(({ id }) => id)).toEqual([
			'alpha',
			'child',
			'beta'
		]);
		expect(searchOrganizationTeams(roots, 'plat')).toEqual([child]);
		expect(flattenOrganizationForest(roots)).toHaveLength(3);
		expect(findOrganizationTeam(roots, 'child')).toEqual(child);
	});

	it('filters inactive subtrees and clears hidden selections', () => {
		const inactiveChild = team('inactive-child', 'Inactive child');
		const inactive = team('inactive', 'Inactive root', [inactiveChild], 'inactive');
		const active = team('active', 'Active root');
		const roots = [inactive, active];
		const visible = visibleOrganizationForest(summary(roots), false);

		expect(visible.map(({ id }) => id)).toEqual(['active']);
		expect(normalizeSelectedTeamId(visible, 'inactive')).toBeNull();
		expect(normalizeSelectedTeamId(visible, 'active')).toBe('active');
	});

	it('builds a synthetic root and only authoritative hierarchy edges', () => {
		const child = team('child', 'Child');
		child.parentTeamId = 'root-a';
		const projection = buildOrganizationChartProjection(
			summary([team('root-b', 'Root B'), team('root-a', 'Root A', [child])]),
			true,
			'TB',
			{
				focalTeamId: 'child',
				organizationExpanded: true,
				expandedTeamIds: new Set(['root-a'])
			}
		);

		expect(projection.nodes).toHaveLength(4);
		expect(projection.nodes[0]).toMatchObject({
			id: 'organization:org-1',
			draggable: false,
			connectable: false,
			selectable: false
		});
		expect(projection.edges.map(({ source, target }) => [source, target])).toEqual([
			['organization:org-1', 'team:root-a'],
			['organization:org-1', 'team:root-b'],
			['team:root-a', 'team:child']
		]);
		expect(teamIdFromNodeId('team:child')).toBe('child');
		expect(teamIdFromNodeId('organization:org-1')).toBeNull();
	});

	it('produces stable equivalent layouts in both orientations', () => {
		const child = team('child', 'Child');
		child.parentTeamId = 'root';
		const data = summary([team('root', 'Root', [child])]);
		const disclosure = {
			focalTeamId: 'child',
			organizationExpanded: false,
			expandedTeamIds: new Set<string>()
		};
		const first = buildOrganizationChartProjection(data, true, 'TB', disclosure);
		const second = buildOrganizationChartProjection(data, true, 'TB', disclosure);
		const horizontal = buildOrganizationChartProjection(data, true, 'LR', disclosure);

		expect(first.nodes.map(({ id, position }) => ({ id, position }))).toEqual(
			second.nodes.map(({ id, position }) => ({ id, position }))
		);
		expect(first.fitViewKey).toBe(second.fitViewKey);
		expect(horizontal.fitViewKey).not.toBe(first.fitViewKey);
		expect(horizontal.nodes.map(({ position }) => position)).not.toEqual(
			first.nodes.map(({ position }) => position)
		);
	});

	it('focuses a selected Team with its full Organization lineage', () => {
		const leaf = team('leaf', 'Leaf');
		leaf.parentTeamId = 'selected';
		const selected = team('selected', 'Selected', [leaf]);
		selected.parentTeamId = 'middle';
		const middle = team('middle', 'Middle', [selected]);
		middle.parentTeamId = 'root';
		const projection = buildOrganizationChartProjection(
			summary([team('root', 'Root', [middle]), team('sibling-root', 'Sibling root')]),
			true,
			'TB',
			{
				focalTeamId: 'selected',
				organizationExpanded: false,
				expandedTeamIds: new Set()
			}
		);

		expect(focusNodeIdsForTeam(projection, 'selected')).toEqual([
			'organization:org-1',
			'team:root',
			'team:middle',
			'team:selected'
		]);
		expect(focusNodeIdsForTeam(projection, 'missing')).toEqual([]);
		expect(focusNodeIdsForTeam(projection, null)).toEqual([]);
	});

	it('reveals focal ancestry and expands Organization and Team levels incrementally', () => {
		const grandchild = team('grandchild', 'Grandchild');
		grandchild.parentTeamId = 'child';
		const child = team('child', 'Child', [grandchild]);
		child.parentTeamId = 'focal';
		const focal = team('focal', 'Focal', [child]);
		focal.parentTeamId = 'root';
		const root = team('root', 'Root', [focal]);
		const data = summary([root, team('other-root', 'Other root')]);

		expect(focalTeamPath(data.roots, 'focal').map(({ id }) => id)).toEqual(['root', 'focal']);
		const focused = buildOrganizationChartProjection(data, true, 'TB', {
			focalTeamId: 'focal',
			organizationExpanded: false,
			expandedTeamIds: new Set()
		});
		expect(focused.revealedTeamIds).toEqual(['root', 'focal']);
		expect(focused.edges.map(({ source, target }) => [source, target])).toEqual([
			['organization:org-1', 'team:root'],
			['team:root', 'team:focal']
		]);
		expect(new Set(focused.nodes.map(({ position }) => position.y)).size).toBe(3);

		const expanded = buildOrganizationChartProjection(data, true, 'TB', {
			focalTeamId: 'focal',
			organizationExpanded: true,
			expandedTeamIds: new Set(['focal'])
		});
		expect(expanded.revealedTeamIds).toEqual(['other-root', 'root', 'focal', 'child']);
		expect(expanded.revealedTeamIds).not.toContain('grandchild');
	});

	it('collapses optional descendant expansion recursively', () => {
		const grandchild = team('grandchild', 'Grandchild');
		const child = team('child', 'Child', [grandchild]);
		const root = team('root', 'Root', [child]);
		expect(
			collapseTeamExpansion([root], new Set(['root', 'child', 'grandchild', 'unrelated']), 'root')
		).toEqual(new Set(['unrelated']));
	});

	it('handles empty and cyclic defensive input without rendering forever', () => {
		const empty = buildOrganizationChartProjection(summary([]), true, 'TB');
		expect(empty).toMatchObject({ nodes: [], edges: [], visibleRoots: [] });

		const cyclic = team('cycle', 'Cycle');
		cyclic.children = [cyclic];
		expect(flattenOrganizationForest([cyclic])).toEqual([cyclic]);
		expect(visibleOrganizationForest(summary([cyclic]), true)[0].children).toEqual([]);
	});
});
