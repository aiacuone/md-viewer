import { error, isRedirect, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	SESSION_COOKIE,
	STATE_COOKIE,
	cookieBase,
	exchangeGoogleCode,
	isAllowed,
	isSecureOrigin,
	publicOrigin,
	rateLimit,
	safeEqual,
	signSession
} from '$lib/server/auth';

const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

export const GET: RequestHandler = async ({ cookies, url, getClientAddress }) => {
	if (!rateLimit(`callback:${getClientAddress()}`, 10)) error(429, 'Too many requests');
	const origin = publicOrigin(url);
	const secure = isSecureOrigin(origin);
	const state = url.searchParams.get('state') ?? '';
	const saved = cookies.get(STATE_COOKIE) ?? '';
	cookies.delete(STATE_COOKIE, { path: '/' });
	if (!state || !saved || !safeEqual(state, saved)) redirect(303, '/login?error=state');

	const code = url.searchParams.get('code');
	if (!code) redirect(303, '/preview?denied=1');

	try {
		const profile = await exchangeGoogleCode(origin, code);
		if (!profile.email || !profile.emailVerified || !isAllowed(profile.email)) {
			redirect(303, '/preview?denied=1');
		}
		cookies.set(SESSION_COOKIE, signSession(profile.email), {
			...cookieBase(secure),
			maxAge: SESSION_MAX_AGE
		});
		redirect(303, '/');
	} catch (err) {
		if (isRedirect(err)) throw err;
		redirect(303, '/login?error=google');
	}
};
