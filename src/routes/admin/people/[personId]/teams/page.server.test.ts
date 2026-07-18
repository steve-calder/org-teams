import { describe, expect, it, vi } from 'vitest';

const getPersonMembershipAdminContext = vi.fn();
const createTeamMembership = vi.fn();
const updateTeamMembershipRole = vi.fn();
const removeTeamMembership = vi.fn();
vi.mock('$lib/server/admin/team-memberships', () => ({
	getPersonMembershipAdminContext,
	createTeamMembership,
	updateTeamMembershipRole,
	removeTeamMembership
}));

const { actions, load } = await import('./+page.server');
const adminLocals = { user: { id: 'admin-id', role: 'admin' }, session: { id: 'session-id' } };

describe('/admin/people/[personId]/teams server', () => {
	it('loads cross-Organization memberships, managed Teams, and eligible Teams', async () => {
		getPersonMembershipAdminContext.mockResolvedValue({
			person: { id: 'person-id', displayName: 'Member', status: 'active' },
			ordinaryMemberships: [
				{ membershipId: 'membership-id', teamId: 'team-one', organizationName: 'First' }
			],
			managedTeams: [{ teamId: 'team-two', organizationName: 'Second' }],
			eligibleTeams: [{ id: 'team-three', organizationName: 'Third' }]
		});
		const result = (await load({
			locals: adminLocals,
			params: { personId: 'person-id' }
		} as never))!;
		expect(result.membershipContext).toMatchObject({
			ordinaryMemberships: [{ teamId: 'team-one' }],
			managedTeams: [{ teamId: 'team-two' }],
			eligibleTeams: [{ id: 'team-three' }]
		});
	});

	it('returns 404 for an unknown Person and authorizes before reading membership data', async () => {
		getPersonMembershipAdminContext.mockResolvedValue(undefined);
		await expect(() =>
			load({ locals: adminLocals, params: { personId: 'missing' } } as never)
		).rejects.toMatchObject({ status: 404 });

		getPersonMembershipAdminContext.mockClear();
		await expect(() =>
			load({
				locals: { user: { id: 'user-id', role: 'user' }, session: { id: 'session-id' } },
				params: { personId: 'person-id' }
			} as never)
		).rejects.toMatchObject({ status: 403 });
		expect(getPersonMembershipAdminContext).not.toHaveBeenCalled();
	});

	it('passes Person-scoped create, role, and remove actions to membership services', async () => {
		createTeamMembership.mockResolvedValue({ id: 'membership-id' });
		updateTeamMembershipRole.mockResolvedValue({ id: 'membership-id' });
		removeTeamMembership.mockResolvedValue(undefined);

		await actions.create!({
			locals: adminLocals,
			params: { personId: 'person-id' },
			request: new Request('http://localhost/admin/people/person-id/teams?/create', {
				method: 'POST',
				body: new URLSearchParams({ teamId: 'team-id', role: 'Designer' })
			})
		} as never);
		await actions.role!({
			locals: adminLocals,
			params: { personId: 'person-id' },
			request: new Request('http://localhost/admin/people/person-id/teams?/role', {
				method: 'POST',
				body: new URLSearchParams({ membershipId: 'membership-id', role: 'Lead designer' })
			})
		} as never);
		await actions.remove!({
			locals: adminLocals,
			params: { personId: 'person-id' },
			request: new Request('http://localhost/admin/people/person-id/teams?/remove', {
				method: 'POST',
				body: new URLSearchParams({ membershipId: 'membership-id' })
			})
		} as never);

		expect(createTeamMembership).toHaveBeenCalledWith(
			'person-id',
			'team-id',
			'Designer',
			'admin-id'
		);
		expect(updateTeamMembershipRole).toHaveBeenCalledWith(
			'membership-id',
			'Lead designer',
			'admin-id',
			{ personId: 'person-id' }
		);
		expect(removeTeamMembership).toHaveBeenCalledWith('membership-id', 'admin-id', {
			personId: 'person-id'
		});
	});

	it('returns stable validation failures and rejects unauthorized mutations', async () => {
		updateTeamMembershipRole.mockRejectedValue(new Error('Team membership not found.'));
		const result = await actions.role!({
			locals: adminLocals,
			params: { personId: 'person-id' },
			request: new Request('http://localhost/admin/people/person-id/teams?/role', {
				method: 'POST',
				body: new URLSearchParams({ membershipId: 'missing', role: 'Role' })
			})
		} as never);
		expect(result).toMatchObject({
			status: 400,
			data: { message: 'Team membership not found.' }
		});

		removeTeamMembership.mockClear();
		await expect(() =>
			actions.remove!({
				locals: { user: { id: 'user-id', role: 'user' }, session: { id: 'session-id' } },
				params: { personId: 'person-id' },
				request: new Request('http://localhost/admin/people/person-id/teams?/remove', {
					method: 'POST',
					body: new URLSearchParams({ membershipId: 'membership-id' })
				})
			} as never)
		).rejects.toMatchObject({ status: 403 });
		expect(removeTeamMembership).not.toHaveBeenCalled();
	});
});
