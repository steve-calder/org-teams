import { describe, expect, it, vi } from 'vitest';

const addLoginToPerson = vi.fn();
const removePersonLogin = vi.fn();
const replaceUserPassword = vi.fn();
const setAdministratorAccess = vi.fn();
const setLoginBan = vi.fn();
const updateAuthenticationDetails = vi.fn();

vi.mock('$lib/server/admin/authentication', () => ({
	addLoginToPerson,
	removePersonLogin,
	replaceUserPassword,
	setAdministratorAccess,
	setLoginBan,
	updateAuthenticationDetails
}));

const { actions } = await import('./+page.server');
const adminLocals = {
	user: { id: 'admin-id', role: 'admin' },
	session: { id: 'session-id' }
};

const post = (action: string, values: Record<string, string>) =>
	new Request(`http://localhost/admin/people/person-id/authentication?/${action}`, {
		method: 'POST',
		body: new URLSearchParams(values)
	});

describe('Person authentication admin actions', () => {
	it('independently rejects a non-admin direct action request', async () => {
		await expect(async () =>
			actions.password!({
				locals: { user: { id: 'user-id', role: 'user' }, session: { id: 'session-id' } },
				params: { personId: 'person-id' },
				request: post('password', { newPassword: 'not-authorized' })
			} as never)
		).rejects.toMatchObject({ status: 403 });
		expect(replaceUserPassword).not.toHaveBeenCalled();
	});

	it('does not return a submitted replacement password in action data', async () => {
		replaceUserPassword.mockResolvedValue(undefined);
		const result = await actions.password!({
			locals: adminLocals,
			params: { personId: 'person-id' },
			request: post('password', { newPassword: 'replacement-secret' })
		} as never);

		expect(result).toEqual({ success: 'Password replaced.' });
		expect(JSON.stringify(result)).not.toContain('replacement-secret');
	});

	it('passes confirmation to the protected login-removal service', async () => {
		removePersonLogin.mockRejectedValue(new Error('Type REMOVE LOGIN to confirm this action.'));
		const result = await actions.remove!({
			locals: adminLocals,
			params: { personId: 'person-id' },
			request: post('remove', { confirmation: '' })
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: { message: 'Type REMOVE LOGIN to confirm this action.' }
		});
	});
});
