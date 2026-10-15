import { error, redirect, type Handle } from '@sveltejs/kit';
import { readSession, SESSION_COOKIE } from '$lib/server/auth';

const PUBLIC_FILE = /\.(css|js|map|svg|png|ico|webp|webmanifest|woff2?|txt|json)$/i;

function isPublic(pathname: string): boolean {
	if (pathname === '/welcome') return true;
	if (pathname === '/preview' || pathname.startsWith('/preview/')) return true;
	if (pathname === '/login' || pathname.startsWith('/login/')) return true;
	if (pathname === '/auth/callback/google') return true;
	if (pathname === '/logout') return true;
	if (pathname.startsWith('/_app/')) return true;
	if (PUBLIC_FILE.test(pathname)) return true;
	return false;
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = readSession(event.cookies.get(SESSION_COOKIE));

	if (event.locals.user || isPublic(event.url.pathname)) {
		return resolve(event);
	}

	if (event.url.pathname.startsWith('/api/')) {
		error(401, 'Sign in required');
	}

	redirect(303, '/welcome');
};
