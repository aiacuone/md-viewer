import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	STATE_COOKIE,
	cookieBase,
	googleAuthUrl,
	googleConfigured,
	isSecureOrigin,
	newState,
	publicOrigin,
	rateLimit
} from '$lib/server/auth';

export const GET: RequestHandler = ({ cookies, url, getClientAddress }) => {
	if (!rateLimit(`oauth:${getClientAddress()}`, 10)) error(429, 'Too many requests');
	const origin = publicOrigin(url);
	if (!googleConfigured()) redirect(303, '/login?error=config');
	const state = newState();
	cookies.set(STATE_COOKIE, state, { ...cookieBase(isSecureOrigin(origin)), maxAge: 600 });
	redirect(303, googleAuthUrl(origin, state));
};
