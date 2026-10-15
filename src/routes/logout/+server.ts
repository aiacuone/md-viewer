import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE, cookieBase, isSecureOrigin, publicOrigin } from '$lib/server/auth';

export const POST: RequestHandler = ({ cookies, url }) => {
	cookies.delete(SESSION_COOKIE, cookieBase(isSecureOrigin(publicOrigin(url))));
	redirect(303, '/welcome');
};
