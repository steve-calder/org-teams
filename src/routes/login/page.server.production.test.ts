import { describe, expect, it, vi } from 'vitest';

const signUpEmail = vi.fn();

vi.mock('$app/environment', () => ({ browser: false, building: false, dev: false, version: '' }));
vi.mock('$lib/server/auth', () => ({
	auth: { api: { signInEmail: vi.fn(), signUpEmail } }
}));

const { ensureDevAccount } = await import('$lib/server/dev-account');
const { load } = await import('./+page.server');

describe('production development-account guards', () => {
	it('does not provision or return the default credentials', async () => {
		await ensureDevAccount();
		const result = await load({ locals: {} } as never);

		expect(signUpEmail).not.toHaveBeenCalled();
		expect(result).toEqual({ devCredentials: null });
	});
});
