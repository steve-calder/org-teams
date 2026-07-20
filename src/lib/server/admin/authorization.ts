import { error, redirect } from '@sveltejs/kit';
import type { User } from 'better-auth';

export type RoleUser = User & { role?: string | null };

export function hasAdminRole(role: string | null | undefined): boolean {
	return (
		role
			?.split(',')
			.map((value) => value.trim())
			.includes('admin') ?? false
	);
}

export function isAdminUser(user: RoleUser | undefined): boolean {
	return hasAdminRole(user?.role);
}

export function requireAdmin(locals: App.Locals): RoleUser {
	if (!locals.user || !locals.session) redirect(303, '/login');
	if (!isAdminUser(locals.user)) error(403, 'Administrator access is required.');
	return locals.user;
}
