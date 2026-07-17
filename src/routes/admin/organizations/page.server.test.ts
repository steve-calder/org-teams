import { describe, expect, it, vi } from 'vitest';

const listOrganizations = vi.fn();
const createOrganization = vi.fn();
vi.mock('$lib/server/admin/organizations', () => ({ listOrganizations, createOrganization }));

const { actions, load } = await import('./+page.server');
const adminLocals = { user: { id: 'admin-id', role: 'admin' }, session: { id: 'session-id' } };

describe('/admin/organizations server', () => {
	it('rejects non-administrators before querying', async () => {
		await expect(() =>
			load({
				locals: { user: { id: 'user-id', role: 'user' }, session: { id: 'session-id' } },
				url: new URL('http://localhost/admin/organizations')
			} as never)
		).rejects.toMatchObject({ status: 403 });
		expect(listOrganizations).not.toHaveBeenCalled();
	});

	it('normalizes filters and creates as the authenticated administrator', async () => {
		listOrganizations.mockResolvedValue({ organizations: [], total: 0 });
		await load({
			locals: adminLocals,
			url: new URL('http://localhost/admin/organizations?search=Acme&status=active&page=2')
		} as never);
		expect(listOrganizations).toHaveBeenCalledWith({ search: 'Acme', status: 'active', page: 2 });

		createOrganization.mockResolvedValue({ id: 'organization-id' });
		const request = new Request('http://localhost/admin/organizations?/create', {
			method: 'POST',
			body: new URLSearchParams({ name: 'Acme', description: 'Example' })
		});
		await expect(actions.create!({ locals: adminLocals, request } as never)).resolves.toEqual({
			success: true,
			createdOrganizationId: 'organization-id'
		});
		expect(createOrganization).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Acme', description: 'Example' }),
			'admin-id'
		);
	});
});
