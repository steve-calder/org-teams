import { describe, expect, it, vi } from 'vitest';

const listPeople = vi.fn();
const createPerson = vi.fn();

vi.mock('$lib/server/admin/people', () => ({ listPeople, createPerson }));

const { actions, load } = await import('./+page.server');

const adminLocals = {
	user: { id: 'admin-id', role: 'admin' },
	session: { id: 'session-id' }
};

describe('/admin/people server', () => {
	it('rejects non-admin loads before querying people', async () => {
		await expect(async () =>
			load({
				locals: { user: { id: 'user-id', role: 'user' }, session: { id: 'session-id' } },
				url: new URL('http://localhost/admin/people')
			} as never)
		).rejects.toMatchObject({ status: 403 });
		expect(listPeople).not.toHaveBeenCalled();
	});

	it('passes bounded filter inputs to the directory service', async () => {
		listPeople.mockResolvedValue({ people: [], total: 0 });
		await load({
			locals: adminLocals,
			url: new URL(
				'http://localhost/admin/people?search=Alex&login=none&admin=admin&status=active&page=2'
			)
		} as never);
		expect(listPeople).toHaveBeenCalledWith({
			search: 'Alex',
			login: 'none',
			admin: 'admin',
			status: 'active',
			page: 2
		});
	});

	it('creates a person-only record as the authenticated administrator', async () => {
		createPerson.mockResolvedValue({ id: 'person-id' });
		const request = new Request('http://localhost/admin/people?/create', {
			method: 'POST',
			body: new URLSearchParams({ displayName: 'Person Only', employeeIdentifier: 'E-1' })
		});
		const result = await actions.create!({ locals: adminLocals, request } as never);

		expect(result).toEqual({ success: true, createdPersonId: 'person-id' });
		expect(createPerson).toHaveBeenCalledWith(
			expect.objectContaining({ displayName: 'Person Only', employeeIdentifier: 'E-1' }),
			'admin-id'
		);
	});
});
