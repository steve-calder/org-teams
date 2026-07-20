import { APIError } from 'better-auth/api';
import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { dev } from '$app/environment';
import { DEV_CREDENTIALS } from '$lib/server/dev-account';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/');
	return {
		devCredentials: dev ? DEV_CREDENTIALS : null
	};
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const errors: { email?: string; password?: string } = {};

		if (!email) errors.email = 'Enter your email address.';
		if (!password) errors.password = 'Enter your password.';
		if (errors.email || errors.password) {
			return fail(400, { email, errors });
		}

		try {
			await auth.api.signInEmail({
				body: { email, password }
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, {
					email,
					message: 'The email or password is incorrect.'
				});
			}
			throw error;
		}

		redirect(303, '/');
	}
};
