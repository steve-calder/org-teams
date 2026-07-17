import { describe, expect, it, vi } from 'vitest';

const getTeamAdminDetail = vi.fn();
const updateTeam = vi.fn();
const transferTeam = vi.fn();
const listOrganizationOptions = vi.fn();
const listTeamAuditEvents = vi.fn();
vi.mock('$lib/server/admin/teams', () => ({
	getTeamAdminDetail,
	updateTeam,
	transferTeam,
	TEAM_TYPE_OPTIONS: []
}));
vi.mock('$lib/server/admin/organizations', () => ({ listOrganizationOptions }));
vi.mock('$lib/server/admin/audit', () => ({ listTeamAuditEvents }));

const { actions, load } = await import('./+page.server');
const adminLocals = { user: { id: 'admin-id', role: 'admin' }, session: { id: 'session-id' } };

describe('/admin/teams/[teamId] server', () => {
	it('returns 404 for unknown Teams after authorization', async () => {
		getTeamAdminDetail.mockResolvedValue(undefined);
		listOrganizationOptions.mockResolvedValue([]);
		listTeamAuditEvents.mockResolvedValue([]);
		await expect(() =>
			load({ locals: adminLocals, params: { teamId: 'missing' } } as never)
		).rejects.toMatchObject({ status: 404 });
	});

	it('requires the exact transfer confirmation and authenticated actor', async () => {
		transferTeam.mockResolvedValue({ id: 'team-id' });
		const unconfirmed = new Request('http://localhost/admin/teams/team-id?/transfer', {
			method: 'POST',
			body: new URLSearchParams({ destinationOrganizationId: 'destination', confirmation: 'yes' })
		});
		await actions.transfer!({
			locals: adminLocals,
			params: { teamId: 'team-id' },
			request: unconfirmed
		} as never);
		expect(transferTeam).toHaveBeenLastCalledWith('team-id', 'destination', false, 'admin-id');

		const confirmed = new Request('http://localhost/admin/teams/team-id?/transfer', {
			method: 'POST',
			body: new URLSearchParams({
				destinationOrganizationId: 'destination',
				confirmation: 'TRANSFER'
			})
		});
		await actions.transfer!({
			locals: adminLocals,
			params: { teamId: 'team-id' },
			request: confirmed
		} as never);
		expect(transferTeam).toHaveBeenLastCalledWith('team-id', 'destination', true, 'admin-id');
	});
});
