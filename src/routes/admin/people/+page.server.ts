import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/admin/authorization';
import {
	createPerson,
	listPeople,
	type AdminFilter,
	type LoginFilter,
	type PersonStatusFilter
} from '$lib/server/admin/people';
import type { Actions, PageServerLoad } from './$types';

const oneOf = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
	allowed.includes(value as T) ? (value as T) : fallback;

export const load: PageServerLoad = async ({ locals, url }) => {
	requireAdmin(locals);
	const page = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
	return listPeople({
		search: url.searchParams.get('search') ?? '',
		login: oneOf<LoginFilter>(
			url.searchParams.get('login'),
			['all', 'active', 'disabled', 'none'],
			'all'
		),
		admin: oneOf<AdminFilter>(url.searchParams.get('admin'), ['all', 'admin', 'non-admin'], 'all'),
		status: oneOf<PersonStatusFilter>(
			url.searchParams.get('status'),
			['all', 'active', 'inactive'],
			'all'
		),
		page: Number.isFinite(page) ? page : 1
	});
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const administrator = requireAdmin(locals);
		const formData = await request.formData();
		try {
			const created = await createPerson(
				{
					displayName: formData.get('displayName')?.toString() ?? '',
					legalName: formData.get('legalName')?.toString(),
					employeeIdentifier: formData.get('employeeIdentifier')?.toString(),
					jobTitle: formData.get('jobTitle')?.toString()
				},
				administrator.id
			);
			return { success: true, createdPersonId: created.id };
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Unable to create Person.'
			});
		}
	}
};
