import { describe, expect, it } from 'vitest';
import { hasAdminRole, isAdminUser, requireAdmin } from './authorization';

describe('administrator authorization', () => {
	it('derives the admin flag from Better Auth role values', () => {
		expect(hasAdminRole('admin')).toBe(true);
		expect(hasAdminRole('user,admin')).toBe(true);
		expect(hasAdminRole('user')).toBe(false);
		expect(hasAdminRole(null)).toBe(false);
		expect(isAdminUser({ role: 'admin' } as never)).toBe(true);
	});

	it('redirects anonymous visitors to login', () => {
		expect(() => requireAdmin({} as App.Locals)).toThrowError();
		try {
			requireAdmin({} as App.Locals);
		} catch (result) {
			expect(result).toMatchObject({ status: 303, location: '/login' });
		}
	});

	it('rejects authenticated non-administrators', () => {
		const locals = {
			user: { id: 'user-id', role: 'user' },
			session: { id: 'session-id' }
		} as App.Locals;

		expect(() => requireAdmin(locals)).toThrowError();
		try {
			requireAdmin(locals);
		} catch (result) {
			expect(result).toMatchObject({ status: 403 });
		}
	});

	it('returns only the authenticated administrator identity', () => {
		const user = { id: 'admin-id', role: 'admin' };
		const locals = { user, session: { id: 'session-id' } } as App.Locals;

		expect(requireAdmin(locals)).toBe(user);
	});
});
