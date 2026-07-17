import { describe, expect, it } from 'vitest';
import { load } from './+layout.server';

describe('root layout server', () => {
	it('reports an anonymous request without exposing session data', async () => {
		const result = await load({ locals: {} } as never);

		expect(result).toEqual({ authenticated: false });
	});

	it('reports a server-resolved authenticated session as a boolean only', async () => {
		const result = await load({
			locals: {
				user: { id: 'auth-user', email: 'person@example.test' },
				session: { id: 'secret-session' }
			}
		} as never);

		expect(result).toEqual({ authenticated: true });
		expect(JSON.stringify(result)).not.toContain('secret-session');
		expect(JSON.stringify(result)).not.toContain('person@example.test');
	});

	it('does not treat partial identity state as authenticated', async () => {
		const result = await load({ locals: { user: { id: 'auth-user' } } } as never);

		expect(result).toEqual({ authenticated: false });
	});
});
