import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { aboutText } from '$lib/preview/about';
import { googleConfigured } from '$lib/server/auth';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, '/');

	return {
		aboutText,
		configured: googleConfigured(),
		denied: url.searchParams.get('denied') === '1'
	};
};
