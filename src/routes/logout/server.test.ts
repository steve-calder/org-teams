import { beforeEach, describe, expect, it, vi } from 'vitest';

const signOut = vi.fn();

vi.mock('$lib/server/auth', () => ({
	auth: { api: { signOut } }
}));

const endpoint = await import('./+server');

beforeEach(() => {
	signOut.mockReset();
});

describe('/logout server endpoint', () => {
	it('signs out with the request headers and redirects to login', async () => {
		const request = new Request('http://localhost/logout', {
			method: 'POST',
			headers: { cookie: 'better-auth.session_token=token' }
		});

		await expect(async () => endpoint.POST({ request } as never)).rejects.toMatchObject({
			status: 303,
			location: '/login'
		});
		expect(signOut).toHaveBeenCalledWith({ headers: request.headers });
	});

	it('exports no non-POST request handler', () => {
		expect('GET' in endpoint).toBe(false);
		expect('PUT' in endpoint).toBe(false);
		expect('DELETE' in endpoint).toBe(false);
	});
});
