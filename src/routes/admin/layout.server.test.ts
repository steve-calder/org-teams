import { describe, expect, it } from 'vitest';
import { load } from './+layout.server';

describe('/admin layout authorization', () => {
	it('redirects anonymous requests before loading child data', async () => {
		await expect(async () => load({ locals: {} } as never)).rejects.toMatchObject({
			status: 303,
			location: '/login'
		});
	});

	it('rejects authenticated non-administrators', async () => {
		await expect(async () =>
			load({
				locals: { user: { id: 'user-id', role: 'user' }, session: { id: 'session-id' } }
			} as never)
		).rejects.toMatchObject({ status: 403 });
	});

	it('returns only the administrator ID for authorized requests', async () => {
		const result = await load({
			locals: {
				user: { id: 'admin-id', role: 'admin', email: 'secret@example.test' },
				session: { id: 'secret-session' }
			}
		} as never);

		expect(result).toEqual({ administratorId: 'admin-id' });
		expect(JSON.stringify(result)).not.toContain('secret@example.test');
		expect(JSON.stringify(result)).not.toContain('secret-session');
	});
});
