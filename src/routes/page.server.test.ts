import { describe, expect, it, vi } from 'vitest';

const getPersonalDashboard = vi.fn();
vi.mock('$lib/server/dashboard/personal', () => ({ getPersonalDashboard }));

const { load } = await import('./+page.server');

describe('/ server load', () => {
	it('returns no dashboard and performs no personal query for an anonymous request', async () => {
		getPersonalDashboard.mockClear();
		const result = await load({
			locals: {},
			url: new URL('http://localhost/?personId=other')
		} as never);
		expect(result).toEqual({ personalDashboard: null });
		expect(getPersonalDashboard).not.toHaveBeenCalled();
	});

	it('loads only the trusted session-linked Person dashboard', async () => {
		getPersonalDashboard.mockResolvedValue({
			person: { id: 'trusted-person', displayName: 'Trusted Person' },
			organizations: [],
			organizationCount: 0,
			teamCount: 0
		});
		const result = await load({
			locals: {
				user: { id: 'user-id', role: 'user' },
				session: { id: 'session-id' },
				person: { id: 'trusted-person', displayName: 'Trusted Person' }
			},
			url: new URL('http://localhost/?personId=claimed-person')
		} as never);
		expect(getPersonalDashboard).toHaveBeenCalledWith('trusted-person');
		expect(result).toEqual({
			personalDashboard: {
				person: { id: 'trusted-person', displayName: 'Trusted Person' },
				organizations: [],
				organizationCount: 0,
				teamCount: 0
			}
		});
		expect(JSON.stringify(result)).not.toMatch(/claimed-person|role|session-id|user-id/);
	});

	it('uses the same personal scope for an administrator', async () => {
		getPersonalDashboard.mockResolvedValue({
			person: { id: 'admin-person', displayName: 'Administrator' },
			organizations: [],
			organizationCount: 0,
			teamCount: 0
		});
		await load({
			locals: {
				user: { id: 'admin-user', role: 'admin' },
				session: { id: 'session-id' },
				person: { id: 'admin-person', displayName: 'Administrator' },
				isAdmin: true
			}
		} as never);
		expect(getPersonalDashboard).toHaveBeenLastCalledWith('admin-person');
	});

	it('does not query personal data when session context lacks a linked Person', async () => {
		getPersonalDashboard.mockClear();
		const result = await load({
			locals: { user: { id: 'user-id' }, session: { id: 'session-id' } }
		} as never);
		expect(result).toEqual({ personalDashboard: null });
		expect(getPersonalDashboard).not.toHaveBeenCalled();
	});
});
