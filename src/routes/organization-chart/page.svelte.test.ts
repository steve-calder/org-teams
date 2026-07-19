import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { OrganizationChartSummary } from '$lib/organization-chart/model';
import Page from './+page.svelte';

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

		await screen.getByLabelText('Find a Team').fill('Plat');
		await screen.getByRole('button', { name: 'Platform', exact: true }).click();
		await expect.element(screen.getByText('Morgan Manager', { exact: true })).toBeVisible();
		await expect
			.element(screen.getByText('This view is informational.', { exact: false }))
			.toBeVisible();
		expect(
			screen
				.getByRole('link')
				.elements()
				.some((element) => element.getAttribute('href')?.includes('/admin'))
		).toBe(false);
		expect(screen.getByRole('button', { name: /edit|delete|move/i }).elements()).toHaveLength(0);
	});

	it('switches views and applies the inactive lifecycle filter to the tree fallback', async () => {
		const screen = await render(Page, { data } as never);
		await expect.element(screen.getByText('Accessible hierarchy list')).toBeVisible();
		await screen.getByRole('button', { name: 'Tree' }).click();
		await expect
			.element(screen.getByRole('heading', { name: 'Team hierarchy tree' }))
			.toBeVisible();
		expect(screen.getByRole('button', { name: /Legacy/ }).elements()).toHaveLength(0);
		await screen.getByRole('button', { name: /Show top-level Teams/ }).click();
		await expect.element(screen.getByRole('button', { name: /Legacy/ })).toBeVisible();

		await screen.getByRole('checkbox', { name: 'Show inactive Teams' }).click();
		expect(screen.getByRole('button', { name: /Legacy/ }).elements()).toHaveLength(0);
		await expect.element(screen.getByRole('button', { name: /^Engineering active/ })).toBeVisible();
		expect(screen.getByRole('button', { name: 'Left to right' }).elements()).toHaveLength(0);
	});
});
