import { beforeEach, describe, expect, it, vi } from 'vitest';

const listOrganizationChartOptions = vi.fn();
const getOrganizationChart = vi.fn();
const getDefaultOrganizationChartSelection = vi.fn();
vi.mock('$lib/server/organization-chart', () => ({
	listOrganizationChartOptions,
	getOrganizationChart,
	getDefaultOrganizationChartSelection
}));

const { load } = await import('./+page.server');
const authenticatedLocals = {
	user: { id: 'user-id', role: 'user' },
	session: { id: 'session-id' }
};

describe('/organization-chart server', () => {
	beforeEach(() => {
		listOrganizationChartOptions.mockReset();
		getOrganizationChart.mockReset();
		getDefaultOrganizationChartSelection.mockReset();
		getDefaultOrganizationChartSelection.mockResolvedValue(null);
	});

	it('redirects anonymous requests before reading Organization data', async () => {
		await expect(() =>
			load({ locals: {}, url: new URL('http://localhost/organization-chart') } as never)
		).rejects.toMatchObject({ status: 303, location: '/login' });
		expect(listOrganizationChartOptions).not.toHaveBeenCalled();
		expect(getOrganizationChart).not.toHaveBeenCalled();
		expect(getDefaultOrganizationChartSelection).not.toHaveBeenCalled();
	});

	it('allows a non-admin session without a linked Person and loads only the selected hierarchy', async () => {
		listOrganizationChartOptions.mockResolvedValue([
			{ id: 'alpha', name: 'Alpha', status: 'active' },
			{ id: 'beta', name: 'Beta', status: 'active' }
		]);
		getOrganizationChart.mockResolvedValue({
			organization: { id: 'beta', name: 'Beta', status: 'active' },
			roots: [],
			total: 0,
			hasIntegrityIssue: false
		});

		const result = await load({
			locals: authenticatedLocals,
			url: new URL('http://localhost/organization-chart?organizationId=beta')
		} as never);
		expect(getOrganizationChart).toHaveBeenCalledOnce();
		expect(getOrganizationChart).toHaveBeenCalledWith('beta');
		expect(result).toMatchObject({ selectedOrganizationId: 'beta', selectedTeamId: null });
		expect(JSON.stringify(result)).not.toMatch(/session-id|user-id|role/);
	});

	it('normalizes an unknown selection to the first stable Organization', async () => {
		listOrganizationChartOptions.mockResolvedValue([
			{ id: 'alpha', name: 'Alpha', status: 'active' },
			{ id: 'beta', name: 'Beta', status: 'inactive' }
		]);
		getOrganizationChart.mockResolvedValue({
			organization: { id: 'alpha', name: 'Alpha', status: 'active' },
			roots: [],
			total: 0,
			hasIntegrityIssue: false
		});

		const result = await load({
			locals: { ...authenticatedLocals, isAdmin: true },
			url: new URL('http://localhost/organization-chart?organizationId=unknown')
		} as never);
		expect(getOrganizationChart).toHaveBeenCalledWith('alpha');
		expect(result).toMatchObject({ selectedOrganizationId: 'alpha' });
	});

	it('defaults to a stable Team associated with the authenticated user', async () => {
		listOrganizationChartOptions.mockResolvedValue([
			{ id: 'alpha', name: 'Alpha', status: 'active' },
			{ id: 'beta', name: 'Beta', status: 'active' }
		]);
		getDefaultOrganizationChartSelection.mockResolvedValue({
			organizationId: 'beta',
			teamId: 'team-child'
		});
		getOrganizationChart.mockResolvedValue({
			organization: { id: 'beta', name: 'Beta', status: 'active' },
			roots: [
				{
					id: 'team-root',
					children: [{ id: 'team-child', children: [] }]
				}
			],
			total: 2,
			hasIntegrityIssue: false
		});

		const result = await load({
			locals: authenticatedLocals,
			url: new URL('http://localhost/organization-chart')
		} as never);
		expect(getDefaultOrganizationChartSelection).toHaveBeenCalledWith('user-id');
		expect(getOrganizationChart).toHaveBeenCalledWith('beta');
		expect(result).toMatchObject({
			selectedOrganizationId: 'beta',
			selectedTeamId: 'team-child'
		});
	});

	it('accepts only a focal Team belonging to the selected Organization', async () => {
		listOrganizationChartOptions.mockResolvedValue([
			{ id: 'alpha', name: 'Alpha', status: 'active' }
		]);
		getOrganizationChart.mockResolvedValue({
			organization: { id: 'alpha', name: 'Alpha', status: 'active' },
			roots: [{ id: 'team-alpha', children: [] }],
			total: 1,
			hasIntegrityIssue: false
		});

		const valid = await load({
			locals: authenticatedLocals,
			url: new URL('http://localhost/organization-chart?organizationId=alpha&teamId=team-alpha')
		} as never);
		const invalid = await load({
			locals: authenticatedLocals,
			url: new URL('http://localhost/organization-chart?organizationId=alpha&teamId=team-other')
		} as never);

		expect(valid).toMatchObject({ selectedTeamId: 'team-alpha' });
		expect(invalid).toMatchObject({ selectedTeamId: null });
		expect(getDefaultOrganizationChartSelection).not.toHaveBeenCalled();
	});

	it('returns an explicit empty state without a hierarchy read', async () => {
		listOrganizationChartOptions.mockResolvedValue([]);
		const result = await load({
			locals: authenticatedLocals,
			url: new URL('http://localhost/organization-chart')
		} as never);

		expect(result).toEqual({
			organizations: [],
			selectedOrganizationId: null,
			selectedTeamId: null,
			chart: null
		});
		expect(getOrganizationChart).not.toHaveBeenCalled();
	});
});
