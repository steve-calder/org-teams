import { describe, expect, it, vi } from 'vitest';

class TeamTransferBlockedError extends Error {
	constructor(public blockingTeams: { id: string; name: string }[]) {
		super('Clear Team hierarchy first.');
	}
}
class TeamDeactivationBlockedError extends Error {
	constructor(public blockingTeams: { id: string; name: string }[]) {
		super('Resolve active descendants first.');
	}
}

const getTeamAdminDetail = vi.fn();
const updateTeam = vi.fn();
const transferTeam = vi.fn();
const listOrganizationOptions = vi.fn();
const listTeamAuditEvents = vi.fn();
const getTeamHierarchyContext = vi.fn();
const listEligibleParentOptions = vi.fn();
const listActiveManagerOptions = vi.fn();
const assignTeamParent = vi.fn();
const assignTeamManager = vi.fn();
const getTeamMembershipAdminContext = vi.fn();
const createTeamMembership = vi.fn();
const updateTeamMembershipRole = vi.fn();
const removeTeamMembership = vi.fn();
vi.mock('$lib/server/admin/teams', () => ({
	getTeamAdminDetail,
	updateTeam,
	transferTeam,
	TeamTransferBlockedError,
	TeamDeactivationBlockedError,
	TEAM_TYPE_OPTIONS: []
}));
vi.mock('$lib/server/admin/organizations', () => ({ listOrganizationOptions }));
vi.mock('$lib/server/admin/audit', () => ({ listTeamAuditEvents }));
vi.mock('$lib/server/admin/team-hierarchy', () => ({
	getTeamHierarchyContext,
	listEligibleParentOptions,
	listActiveManagerOptions,
	assignTeamParent,
	assignTeamManager
}));
vi.mock('$lib/server/admin/team-memberships', () => ({
	getTeamMembershipAdminContext,
	createTeamMembership,
	updateTeamMembershipRole,
	removeTeamMembership
}));

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

	it('loads hierarchy context and protects it behind administrator authorization', async () => {
		getTeamHierarchyContext.mockClear();
		await expect(() =>
			load({
				locals: { user: { id: 'user-id', role: 'user' }, session: { id: 'session-id' } },
				params: { teamId: 'team-id' }
			} as never)
		).rejects.toMatchObject({ status: 403 });
		expect(getTeamHierarchyContext).not.toHaveBeenCalled();

		getTeamAdminDetail.mockResolvedValue({
			team: { id: 'team-id' },
			organization: { id: 'organization-id' }
		});
		listOrganizationOptions.mockResolvedValue([]);
		listTeamAuditEvents.mockResolvedValue([]);
		getTeamHierarchyContext.mockResolvedValue({ parent: null, children: [], manager: null });
		listEligibleParentOptions.mockResolvedValue([{ id: 'parent-id', name: 'Parent' }]);
		listActiveManagerOptions.mockResolvedValue([{ id: 'person-id', displayName: 'Manager' }]);
		getTeamMembershipAdminContext.mockResolvedValue({
			roster: [{ kind: 'manager', personId: 'person-id' }],
			eligiblePeople: [{ id: 'member-id', displayName: 'Member' }]
		});
		const result = await load({ locals: adminLocals, params: { teamId: 'team-id' } } as never);
		expect(result).toMatchObject({
			hierarchy: { parent: null },
			eligibleParents: [{ id: 'parent-id' }],
			managerOptions: [{ id: 'person-id' }],
			membershipContext: {
				roster: [{ kind: 'manager', personId: 'person-id' }],
				eligiblePeople: [{ id: 'member-id' }]
			}
		});
	});

	it('passes Team-scoped membership actions through the transactional service', async () => {
		createTeamMembership.mockResolvedValue({ id: 'membership-id' });
		updateTeamMembershipRole.mockResolvedValue({ id: 'membership-id' });
		removeTeamMembership.mockResolvedValue(undefined);

		await actions.membershipCreate!({
			locals: adminLocals,
			params: { teamId: 'team-id' },
			request: new Request('http://localhost/admin/teams/team-id?/membershipCreate', {
				method: 'POST',
				body: new URLSearchParams({ personId: 'person-id', role: 'Staff engineer' })
			})
		} as never);
		await actions.membershipRole!({
			locals: adminLocals,
			params: { teamId: 'team-id' },
			request: new Request('http://localhost/admin/teams/team-id?/membershipRole', {
				method: 'POST',
				body: new URLSearchParams({ membershipId: 'membership-id', role: 'Principal engineer' })
			})
		} as never);
		await actions.membershipRemove!({
			locals: adminLocals,
			params: { teamId: 'team-id' },
			request: new Request('http://localhost/admin/teams/team-id?/membershipRemove', {
				method: 'POST',
				body: new URLSearchParams({ membershipId: 'membership-id' })
			})
		} as never);

		expect(createTeamMembership).toHaveBeenCalledWith(
			'person-id',
			'team-id',
			'Staff engineer',
			'admin-id'
		);
		expect(updateTeamMembershipRole).toHaveBeenCalledWith(
			'membership-id',
			'Principal engineer',
			'admin-id',
			{ teamId: 'team-id' }
		);
		expect(removeTeamMembership).toHaveBeenCalledWith('membership-id', 'admin-id', {
			teamId: 'team-id'
		});
	});

	it('rejects unauthorized and invalid Team membership mutations', async () => {
		createTeamMembership.mockClear();
		await expect(() =>
			actions.membershipCreate!({
				locals: { user: { id: 'user-id', role: 'user' }, session: { id: 'session-id' } },
				params: { teamId: 'team-id' },
				request: new Request('http://localhost/admin/teams/team-id?/membershipCreate', {
					method: 'POST',
					body: new URLSearchParams({ personId: 'person-id', role: 'Member' })
				})
			} as never)
		).rejects.toMatchObject({ status: 403 });
		expect(createTeamMembership).not.toHaveBeenCalled();

		createTeamMembership.mockRejectedValue(
			new Error('Role must contain between 1 and 160 characters.')
		);
		const result = await actions.membershipCreate!({
			locals: adminLocals,
			params: { teamId: 'team-id' },
			request: new Request('http://localhost/admin/teams/team-id?/membershipCreate', {
				method: 'POST',
				body: new URLSearchParams({ personId: 'person-id', role: '' })
			})
		} as never);
		expect(result).toMatchObject({ status: 400, data: { message: expect.stringMatching(/Role/) } });
	});

	it('passes untrusted parent and manager identifiers through validated services', async () => {
		assignTeamParent.mockResolvedValue({ id: 'team-id' });
		assignTeamManager.mockResolvedValue({ id: 'team-id' });
		await actions.parent!({
			locals: adminLocals,
			params: { teamId: 'team-id' },
			request: new Request('http://localhost/admin/teams/team-id?/parent', {
				method: 'POST',
				body: new URLSearchParams({ parentTeamId: 'untrusted-parent' })
			})
		} as never);
		await actions.manager!({
			locals: adminLocals,
			params: { teamId: 'team-id' },
			request: new Request('http://localhost/admin/teams/team-id?/manager', {
				method: 'POST',
				body: new URLSearchParams({ managerPersonId: '' })
			})
		} as never);
		expect(assignTeamParent).toHaveBeenCalledWith('team-id', 'untrusted-parent', 'admin-id');
		expect(assignTeamManager).toHaveBeenCalledWith('team-id', null, 'admin-id');
	});

	it('returns hierarchy blockers and validation conflicts without partial route state', async () => {
		transferTeam.mockRejectedValue(
			new TeamTransferBlockedError([{ id: 'child-id', name: 'Child Team' }])
		);
		const transferResult = await actions.transfer!({
			locals: adminLocals,
			params: { teamId: 'team-id' },
			request: new Request('http://localhost/admin/teams/team-id?/transfer', {
				method: 'POST',
				body: new URLSearchParams({
					destinationOrganizationId: 'destination',
					confirmation: 'TRANSFER'
				})
			})
		} as never);
		expect(transferResult).toMatchObject({
			status: 409,
			data: { blockingTeams: [{ id: 'child-id' }] }
		});

		assignTeamParent.mockRejectedValue(new Error('This parent assignment would create a cycle.'));
		const parentResult = await actions.parent!({
			locals: adminLocals,
			params: { teamId: 'team-id' },
			request: new Request('http://localhost/admin/teams/team-id?/parent', {
				method: 'POST',
				body: new URLSearchParams({ parentTeamId: 'child-id' })
			})
		} as never);
		expect(parentResult).toMatchObject({
			status: 400,
			data: { message: expect.stringMatching(/cycle/) }
		});
	});
});
