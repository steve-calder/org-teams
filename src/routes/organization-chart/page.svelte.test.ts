import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { OrganizationChartSummary } from '$lib/organization-chart/model';
import Page from './+page.svelte';

const { replaceState } = vi.hoisted(() => ({ replaceState: vi.fn() }));
vi.mock('$app/navigation', () => ({ replaceState }));

const chart: OrganizationChartSummary = {
	organization: { id: 'org-1', name: 'Example Organization', status: 'active' },
	roots: [
		{
			id: 'engineering',
			name: 'Engineering',
			type: 'department',
			status: 'active',
			parentTeamId: null,
			manager: null,
			members: [],
			ordinaryMembershipCount: 0,
			participantCount: 0,
			children: [
				{
					id: 'platform',
					name: 'Platform',
					type: 'product',
					status: 'active',
					parentTeamId: 'engineering',
					manager: { id: 'manager', displayName: 'Morgan Manager', status: 'active' },
					members: [
						{ id: 'member-1', displayName: 'Alex Member' },
						{ id: 'manager', displayName: 'Morgan Manager' },
						{ id: 'member-2', displayName: 'Taylor Member' }
					],
					ordinaryMembershipCount: 2,
					participantCount: 3,
					children: []
				}
			]
		},
		{
			id: 'legacy',
			name: 'Legacy',
			type: 'other',
			status: 'inactive',
			parentTeamId: null,
			manager: null,
			members: [],
			ordinaryMembershipCount: 0,
			participantCount: 0,
			children: []
		}
	],
	total: 3,
	hasIntegrityIssue: false
};

const data = {
	organizations: [{ id: 'org-1', name: 'Example Organization', status: 'active' as const }],
	selectedOrganizationId: 'org-1',
	selectedTeamId: 'platform',
	chart
};

describe('organization chart page', () => {
	it('searches and selects a Team without exposing administration actions', async () => {
		const screen = await render(Page, { data } as never);
		await expect.element(screen.getByRole('heading', { name: 'Organization chart' })).toBeVisible();
		await expect
			.element(screen.getByText('This is a read-only view.', { exact: false }))
			.toBeVisible();
		const canvas = screen.getByLabelText('Read-only Organization chart');
		await expect
			.element(canvas.getByRole('button', { name: 'Pivot chart to this Team: Engineering' }))
			.toBeVisible();
		await expect.element(canvas.getByLabelText('Platform is the current pivot Team')).toBeVisible();

		await screen.getByLabelText('Find a Team').fill('Plat');
		await screen.getByRole('button', { name: 'Platform', exact: true }).click();
		await expect
			.element(
				screen
					.getByRole('complementary')
					.getByRole('list')
					.getByText('Morgan Manager', { exact: true })
			)
			.toBeVisible();
		expect(
			screen
				.getByRole('link')
				.elements()
				.some((element) => element.getAttribute('href')?.includes('/admin'))
		).toBe(false);
		expect(screen.getByRole('button', { name: /edit|delete|move/i }).elements()).toHaveLength(0);
	});

	it('switches views and applies the inactive lifecycle filter to the tree view', async () => {
		const screen = await render(Page, { data } as never);
		expect(screen.getByText('Accessible hierarchy list').elements()).toHaveLength(0);
		await screen.getByRole('button', { name: 'Tree' }).click();
		await expect
			.element(screen.getByRole('heading', { name: 'Team hierarchy tree' }))
			.toBeVisible();
		expect(screen.getByRole('button', { name: 'Inspect Team Legacy' }).elements()).toHaveLength(0);
		await screen.getByRole('button', { name: /Show top-level Teams/ }).click();
		await expect.element(screen.getByRole('button', { name: 'Inspect Team Legacy' })).toBeVisible();

		await screen.getByRole('checkbox', { name: 'Show inactive Teams' }).click();
		expect(screen.getByRole('button', { name: 'Inspect Team Legacy' }).elements()).toHaveLength(0);
		await expect
			.element(screen.getByRole('button', { name: 'Inspect Team Engineering' }))
			.toBeVisible();
		expect(screen.getByRole('button', { name: 'Left to right' }).elements()).toHaveLength(0);
	});

	it('inspects revealed Teams without changing the pivot or expanded forest', async () => {
		const screen = await render(Page, { data } as never);
		await screen.getByRole('button', { name: 'Tree' }).click();
		await screen.getByRole('button', { name: /Show top-level Teams/ }).click();
		replaceState.mockClear();

		await screen.getByRole('button', { name: 'Inspect Team Engineering' }).click();
		await expect.element(screen.getByRole('complementary').getByText('Engineering')).toBeVisible();
		await screen.getByRole('button', { name: 'Inspect Team Legacy' }).click();
		await expect.element(screen.getByRole('complementary').getByText('Legacy')).toBeVisible();
		await expect
			.element(screen.getByRole('button', { name: /Hide top-level Teams/ }))
			.toBeVisible();
		await expect
			.element(screen.getByRole('button', { name: 'Inspect Team Platform' }))
			.toBeVisible();
		expect(replaceState).not.toHaveBeenCalled();
		await expect.element(screen.getByLabelText('Platform is the current pivot Team')).toBeVisible();

		await screen.getByRole('button', { name: 'Pivot chart to this Team: Legacy' }).click();
		await expect.element(screen.getByLabelText('Legacy is the current pivot Team')).toBeVisible();
		expect(screen.getByRole('button', { name: 'Inspect Team Platform' }).elements()).toHaveLength(
			0
		);
		expect(replaceState).toHaveBeenCalledWith(
			'/organization-chart?organizationId=org-1&teamId=legacy',
			{}
		);
	});
});
