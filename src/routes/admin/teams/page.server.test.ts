import { describe, expect, it, vi } from 'vitest';

const listTeams = vi.fn();
const createTeam = vi.fn();
const listOrganizationOptions = vi.fn();
vi.mock('$lib/server/admin/teams', () => ({
	listTeams,
	createTeam,
	isTeamType: (value: string) => value === 'product',
	TEAM_TYPE_OPTIONS: [{ value: 'product', label: 'Product' }]
}));
vi.mock('$lib/server/admin/organizations', () => ({ listOrganizationOptions }));

const { actions, load } = await import('./+page.server');
const adminLocals = { user: { id: 'admin-id', role: 'admin' }, session: { id: 'session-id' } };

describe('/admin/teams server', () => {
	it('rejects direct non-admin loads before querying', async () => {
		await expect(() =>
			load({
				locals: { user: { id: 'user-id', role: 'user' }, session: { id: 'session-id' } },
				url: new URL('http://localhost/admin/teams')
			} as never)
		).rejects.toMatchObject({ status: 403 });
		expect(listTeams).not.toHaveBeenCalled();
	});

	it('passes combined filters and immutable ownership input to services', async () => {
		listTeams.mockResolvedValue({ teams: [], total: 0 });
		listOrganizationOptions.mockResolvedValue([]);
		await load({
			locals: adminLocals,
			url: new URL(
				'http://localhost/admin/teams?search=Platform&organizationId=org-id&type=product&status=active&page=3'
			)
		} as never);
		expect(listTeams).toHaveBeenCalledWith({
			search: 'Platform',
			organizationId: 'org-id',
			type: 'product',
			status: 'active',
			page: 3
		});

		createTeam.mockResolvedValue({ id: 'team-id' });
		const request = new Request('http://localhost/admin/teams?/create', {
			method: 'POST',
			body: new URLSearchParams({ organizationId: 'org-id', name: 'Platform', type: 'product' })
		});
		await actions.create!({ locals: adminLocals, request } as never);
		expect(createTeam).toHaveBeenCalledWith(
			expect.objectContaining({ organizationId: 'org-id', name: 'Platform', type: 'product' }),
			'admin-id'
		);
	});
});
