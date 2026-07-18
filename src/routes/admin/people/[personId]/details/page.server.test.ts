import { describe, expect, it, vi } from 'vitest';

class PersonDeactivationBlockedError extends Error {
	constructor(public blockingTeams: { id: string; name: string }[]) {
		super('Resolve managed Teams first.');
	}
}

const updatePerson = vi.fn();
vi.mock('$lib/server/admin/people', () => ({ updatePerson, PersonDeactivationBlockedError }));

const { actions } = await import('./+page.server');
const adminLocals = { user: { id: 'admin-id', role: 'admin' }, session: { id: 'session-id' } };

describe('/admin/people/[personId]/details server', () => {
	it('returns managed Team blockers from rejected Person deactivation', async () => {
		updatePerson.mockRejectedValue(
			new PersonDeactivationBlockedError([{ id: 'team-id', name: 'Managed Team' }])
		);
		const result = await actions.default!({
			locals: adminLocals,
			params: { personId: 'person-id' },
			request: new Request('http://localhost/admin/people/person-id/details', {
				method: 'POST',
				body: new URLSearchParams({ displayName: 'Manager', status: 'inactive' })
			})
		} as never);
		expect(result).toMatchObject({
			status: 409,
			data: { blockingTeams: [{ id: 'team-id', name: 'Managed Team' }] }
		});
	});

	it('rejects non-administrators before invoking the Person service', async () => {
		updatePerson.mockClear();
		await expect(() =>
			actions.default!({
				locals: { user: { id: 'user-id', role: 'user' }, session: { id: 'session-id' } },
				params: { personId: 'person-id' },
				request: new Request('http://localhost/admin/people/person-id/details', {
					method: 'POST',
					body: new URLSearchParams({ displayName: 'Manager' })
				})
			} as never)
		).rejects.toMatchObject({ status: 403 });
		expect(updatePerson).not.toHaveBeenCalled();
	});
});
