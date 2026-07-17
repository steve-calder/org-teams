import { describe, expect, it, vi } from 'vitest';

class OrganizationDeactivationBlockedError extends Error {
	constructor(public blockingTeams: { id: string; name: string }[]) {
		super('Resolve active Teams first.');
	}
}
const getOrganizationAdminDetail = vi.fn();
const updateOrganization = vi.fn();
const listOrganizationAuditEvents = vi.fn();
vi.mock('$lib/server/admin/organizations', () => ({
	getOrganizationAdminDetail,
	updateOrganization,
	OrganizationDeactivationBlockedError
}));
vi.mock('$lib/server/admin/audit', () => ({ listOrganizationAuditEvents }));

const { actions, load } = await import('./+page.server');
const adminLocals = { user: { id: 'admin-id', role: 'admin' }, session: { id: 'session-id' } };

describe('/admin/organizations/[organizationId] server', () => {
	it('returns 404 for an unknown record and never leaks it to non-admins', async () => {
		await expect(() =>
			load({
				locals: { user: { id: 'user-id', role: 'user' }, session: { id: 'session-id' } },
				params: { organizationId: 'organization-id' }
			} as never)
		).rejects.toMatchObject({ status: 403 });
		expect(getOrganizationAdminDetail).not.toHaveBeenCalled();
		getOrganizationAdminDetail.mockResolvedValue(undefined);
		await expect(() =>
			load({ locals: adminLocals, params: { organizationId: 'missing' } } as never)
		).rejects.toMatchObject({ status: 404 });
	});

	it('returns blocking Team details from a rejected deactivation', async () => {
		getOrganizationAdminDetail.mockResolvedValue({
			organization: { id: 'organization-id', name: 'Acme', description: null, status: 'active' },
			teams: [],
			activeTeams: []
		});
		updateOrganization.mockRejectedValue(
			new OrganizationDeactivationBlockedError([{ id: 'team-id', name: 'Active Team' }])
		);
		const request = new Request('http://localhost/admin/organizations/organization-id', {
			method: 'POST',
			body: new URLSearchParams({ name: 'Acme', status: 'inactive' })
		});
		const result = await actions.status!({
			locals: adminLocals,
			params: { organizationId: 'organization-id' },
			request
		} as never);
		expect(result).toMatchObject({ status: 409, data: { blockingTeams: [{ id: 'team-id' }] } });
	});
});
