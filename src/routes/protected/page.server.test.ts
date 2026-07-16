import { beforeEach, describe, expect, it, vi } from 'vitest';

const signOut = vi.fn();

vi.mock('$lib/server/auth', () => ({
	auth: { api: { signOut } }
}));

const { actions, load } = await import('./+page.server');

beforeEach(() => {
	signOut.mockReset();
});

describe('/protected server', () => {
	it('redirects an anonymous request to login', async () => {
		await expect(async () => load({ locals: {} } as never)).rejects.toMatchObject({
			status: 303,
			location: '/login'
		});
	});

	it('returns only the session user and linked Person display data', async () => {
		const result = await load({
			locals: {
				user: { name: 'Test Person', email: 'person@example.test' },
				session: { id: 'secret-session' },
				person: { id: 'person-id' }
			}
		} as never);

		expect(result).toEqual({
			user: { name: 'Test Person', email: 'person@example.test' },
			person: { id: 'person-id' }
		});
		expect(JSON.stringify(result)).not.toContain('secret-session');
	});

	it('signs out on the server and redirects to login', async () => {
		const request = new Request('http://localhost/protected?/logout', {
			method: 'POST',
			headers: { cookie: 'better-auth.session_token=token' }
		});

		await expect(async () => actions.logout!({ request } as never)).rejects.toMatchObject({
			status: 303,
			location: '/login'
		});
		expect(signOut).toHaveBeenCalledWith({ headers: request.headers });
	});
});
