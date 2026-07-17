import { describe, expect, it } from 'vitest';

const { load } = await import('./+page.server');

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
});
