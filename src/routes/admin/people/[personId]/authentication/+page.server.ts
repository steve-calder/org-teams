import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/admin/authorization';
import {
	addLoginToPerson,
	removePersonLogin,
	replaceUserPassword,
	setAdministratorAccess,
	setLoginBan,
	updateAuthenticationDetails
} from '$lib/server/admin/authentication';
import type { Actions } from './$types';

const message = (error: unknown, fallback: string) =>
	error instanceof Error ? error.message : fallback;

export const actions: Actions = {
	addLogin: async ({ locals, params, request }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		try {
			await addLoginToPerson(
				params.personId,
				form.get('email')?.toString() ?? '',
				form.get('password')?.toString() ?? '',
				{ actorAuthUserId: admin.id, headers: request.headers }
			);
			return { success: 'Login access added.' };
		} catch (error) {
			return fail(400, { message: message(error, 'Unable to add login.') });
		}
	},
	update: async ({ locals, params, request }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		try {
			await updateAuthenticationDetails(
				params.personId,
				{ email: form.get('email')?.toString() ?? '' },
				{ actorAuthUserId: admin.id, headers: request.headers }
			);
			return { success: 'Authentication details updated.' };
		} catch (error) {
			return fail(400, { message: message(error, 'Unable to update authentication.') });
		}
	},
	password: async ({ locals, params, request }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		try {
			await replaceUserPassword(params.personId, form.get('newPassword')?.toString() ?? '', {
				actorAuthUserId: admin.id,
				headers: request.headers
			});
			return { success: 'Password replaced.' };
		} catch (error) {
			return fail(400, { message: message(error, 'Unable to replace password.') });
		}
	},
	admin: async ({ locals, params, request }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		try {
			await setAdministratorAccess(
				params.personId,
				form.get('isAdmin') === 'true',
				form.get('confirmation')?.toString(),
				{ actorAuthUserId: admin.id, headers: request.headers }
			);
			return { success: 'Administrator access updated.' };
		} catch (error) {
			return fail(400, { message: message(error, 'Unable to update administrator access.') });
		}
	},
	ban: async ({ locals, params, request }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		try {
			await setLoginBan(params.personId, true, form.get('reason')?.toString(), {
				actorAuthUserId: admin.id,
				headers: request.headers
			});
			return { success: 'Login disabled.' };
		} catch (error) {
			return fail(400, { message: message(error, 'Unable to disable login.') });
		}
	},
	unban: async ({ locals, params, request }) => {
		const admin = requireAdmin(locals);
		try {
			await setLoginBan(params.personId, false, undefined, {
				actorAuthUserId: admin.id,
				headers: request.headers
			});
			return { success: 'Login enabled.' };
		} catch (error) {
			return fail(400, { message: message(error, 'Unable to enable login.') });
		}
	},
	remove: async ({ locals, params, request }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		try {
			await removePersonLogin(params.personId, form.get('confirmation')?.toString(), {
				actorAuthUserId: admin.id,
				headers: request.headers
			});
			return { success: 'Login removed; Person retained.' };
		} catch (error) {
			return fail(400, { message: message(error, 'Unable to remove login.') });
		}
	}
};
