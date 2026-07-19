import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { OrganizationChartTeam } from './model';
import OrganizationTree from './OrganizationTree.svelte';
import TeamDetails from './TeamDetails.svelte';

const child: OrganizationChartTeam = {
	id: 'child',
	name: 'Platform',
	type: 'product',
	status: 'active',
	parentTeamId: 'root',
	manager: { id: 'manager', displayName: 'Morgan Manager', status: 'active' },
	ordinaryMembershipCount: 2,
	participantCount: 3,
	children: []
};
const root: OrganizationChartTeam = {
	id: 'root',
	name: 'Engineering',
	type: 'department',
	status: 'active',
	parentTeamId: null,
	manager: null,
	ordinaryMembershipCount: 0,
	participantCount: 0,
	children: [child]
};

describe('read-only organization chart components', () => {
	it('renders equivalent tree context and selects Teams with keyboard-operable buttons', async () => {
		const onselect = vi.fn();
		const onpivot = vi.fn();
		const screen = await render(OrganizationTree, {
			roots: [root],
			selectedTeamId: null,
			pivotTeamId: 'root',
			onselect,
			onpivot
		});

		await expect.element(screen.getByText('Engineering')).toBeVisible();
		await expect
			.element(screen.getByText('Managed by Morgan Manager', { exact: false }))
			.toBeVisible();
		const platform = screen.getByRole('button', { name: 'Inspect Team Platform' });
		await platform.click();
		expect(onselect).toHaveBeenCalledWith('child');
		expect(onpivot).not.toHaveBeenCalled();
		await screen.getByRole('button', { name: 'Pivot chart to this Team: Platform' }).click();
		expect(onpivot).toHaveBeenCalledWith('child');
		expect(onselect).toHaveBeenCalledOnce();
		await expect
			.element(screen.getByLabelText('Engineering is the current pivot Team'))
			.toBeVisible();
		expect(
			screen.getByRole('button', { name: 'Pivot chart to this Team: Engineering' }).elements()
		).toHaveLength(0);
		expect(screen.getByRole('link').elements()).toHaveLength(0);
	});

	it('shows informational details and navigates only through selection callbacks', async () => {
		const onselect = vi.fn();
		const screen = await render(TeamDetails, { team: child, roots: [root], onselect });

		await expect.element(screen.getByRole('heading', { name: 'Team details' })).toBeVisible();
		await expect.element(screen.getByText('Morgan Manager')).toBeVisible();
		expect(
			screen.getByText('This view is informational.', { exact: false }).elements()
		).toHaveLength(0);
		await screen.getByRole('button', { name: 'Engineering' }).click();
		expect(onselect).toHaveBeenCalledWith('root');
		expect(screen.getByRole('link').elements()).toHaveLength(0);
		expect(screen.getByRole('button', { name: /edit/i }).elements()).toHaveLength(0);
	});

	it('communicates missing Team context', async () => {
		const screen = await render(TeamDetails, {
			team: null,
			roots: [root],
			onselect: vi.fn()
		});

		await expect
			.element(screen.getByText('Select a Team to inspect its hierarchy context.'))
			.toBeVisible();
	});

	it('provides accessible Organization and subordinate disclosure controls', async () => {
		const ontoggleorganization = vi.fn();
		const ontoggleteam = vi.fn();
		const revealedRoot = { ...root, children: [] };
		const screen = await render(OrganizationTree, {
			roots: [revealedRoot],
			allRoots: [root],
			selectedTeamId: 'root',
			pivotTeamId: 'root',
			onselect: vi.fn(),
			onpivot: vi.fn(),
			organizationName: 'Example Organization',
			organizationExpanded: false,
			expandedTeamIds: new Set<string>(),
			ontoggleorganization,
			ontoggleteam
		});

		const organizationDisclosure = screen.getByRole('button', { name: /Show top-level Teams/ });
		await expect.element(organizationDisclosure).toHaveAttribute('aria-expanded', 'false');
		await organizationDisclosure.click();
		expect(ontoggleorganization).toHaveBeenCalledOnce();

		const teamDisclosure = screen.getByRole('button', { name: /Show subordinate Teams/ });
		await expect.element(teamDisclosure).toHaveAttribute('aria-expanded', 'false');
		await teamDisclosure.click();
		expect(ontoggleteam).toHaveBeenCalledWith('root');
	});
});
