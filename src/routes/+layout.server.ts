import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	const path = url.pathname;
	return {
		user: locals.user,
		preview: path === '/preview' || path.startsWith('/preview/')
	};
};
