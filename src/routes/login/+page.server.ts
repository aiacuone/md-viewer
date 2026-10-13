import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { googleConfigured, rateLimit } from '$lib/server/auth';

export const load: PageServerLoad = ({ locals, getClientAddress, url }) => {
	if (locals.user) redirect(303, '/');
	if (!rateLimit(`login:${getClientAddress()}`, 30)) error(429, 'Too many requests');
	const errorCode = url.searchParams.get('error');
	return {
		configured: googleConfigured(),
		errorMessage:
			errorCode === 'config'
				? 'Google sign-in is not configured on this server.'
				: errorCode === 'state'
					? 'Sign-in expired. Try again.'
					: errorCode === 'google'
						? 'Google sign-in failed. Try again.'
						: ''
	};
};
