import { APIError } from 'better-auth/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signInEmail = vi.fn();

vi.mock('$lib/server/auth', () => ({
	auth: { api: { signInEmail } }
}));

const { actions, load } = await import('./+page.server');

function loginRequest(email = '', password = ''): Request {
	return new Request('http://localhost/login', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ email, password })
	});
}

beforeEach(() => {
	signInEmail.mockReset();
});

describe('/login server', () => {
	it('returns the default credentials to an anonymous developer', async () => {
		const result = await load({ locals: {} } as never);

		expect(result).toEqual({
			devCredentials: {
				email: 'dev@org-teams.local',
				password: 'password'
			}
		});
	});

	it('redirects an authenticated user', async () => {
		await expect(async () => load({ locals: { user: {} } } as never)).rejects.toMatchObject({
			status: 303,
			location: '/'
		});
	});

	it('rejects missing credentials without calling Better Auth', async () => {
		const result = await actions.default!({ request: loginRequest() } as never);

		expect(result).toMatchObject({
			status: 400,
			data: {
				email: '',
				errors: {
					email: 'Enter your email address.',
					password: 'Enter your password.'
				}
			}
		});
		expect(signInEmail).not.toHaveBeenCalled();
	});

	it('returns a generic error and never returns an invalid password', async () => {
		signInEmail.mockRejectedValue(new APIError('UNAUTHORIZED'));

		const result = await actions.default!({
			request: loginRequest('person@example.test', 'not-the-password')
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: {
				email: 'person@example.test',
				message: 'The email or password is incorrect.'
			}
		});
		expect(JSON.stringify(result)).not.toContain('not-the-password');
	});

	it('authenticates valid credentials and redirects to the authenticated home page', async () => {
		signInEmail.mockResolvedValue({ user: { id: 'auth-user' } });

		await expect(async () =>
			actions.default!({
				request: loginRequest('person@example.test', 'valid-password')
			} as never)
		).rejects.toMatchObject({ status: 303, location: '/' });
		expect(signInEmail).toHaveBeenCalledWith({
			body: { email: 'person@example.test', password: 'valid-password' }
		});
	});
});
