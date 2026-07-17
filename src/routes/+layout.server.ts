import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	authenticated: Boolean(locals.user && locals.session),
	isAdmin: Boolean(locals.user && locals.session && locals.isAdmin)
});
