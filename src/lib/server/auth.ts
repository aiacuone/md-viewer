import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

export const SESSION_COOKIE = 'md_session';
export const STATE_COOKIE = 'md_oauth_state';

const SESSION_MS = 1000 * 60 * 60 * 24 * 14;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

type SessionPayload = { email: string; exp: number };

function readEnv(name: string): string {
	return env[name]?.trim() ?? '';
}

function authSecret(): string | null {
	return readEnv('AUTH_SECRET') || null;
}

export function publicOrigin(url: URL): string {
	const configured = readEnv('PUBLIC_ORIGIN').replace(/\/$/, '');
	return configured || url.origin;
}

export function isSecureOrigin(origin: string): boolean {
	return origin.startsWith('https:');
}

export function cookieBase(secure: boolean) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure
	};
}

function allowedList(): string[] {
	return readEnv('ALLOWED_EMAILS')
		.split(',')
		.map((email) => email.trim().toLowerCase())
		.filter(Boolean);
}

function digest(value: string, secret: string): Buffer {
	return createHmac('sha256', secret).update(value).digest();
}

/** True when the Google email is on the VM allow list. */
export function isAllowed(email: string): boolean {
	const secret = authSecret();
	const list = allowedList();
	if (!secret || list.length === 0) return false;
	const target = digest(email.trim().toLowerCase(), secret);
	let ok = false;
	for (const item of list) {
		const candidate = digest(item, secret);
		if (candidate.length === target.length && timingSafeEqual(candidate, target)) ok = true;
	}
	return ok;
}

export function safeEqual(a: string, b: string): boolean {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	if (left.length !== right.length) return false;
	return timingSafeEqual(left, right);
}

export function signSession(email: string): string {
	const secret = authSecret();
	if (!secret) throw new Error('AUTH_SECRET is not set');
	const payload: SessionPayload = { email: email.trim().toLowerCase(), exp: Date.now() + SESSION_MS };
	const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
	const sig = createHmac('sha256', secret).update(body).digest('base64url');
	return `${body}.${sig}`;
}

export function readSession(token: string | undefined): { email: string } | null {
	const secret = authSecret();
	if (!secret || !token) return null;
	const dot = token.indexOf('.');
	if (dot <= 0) return null;
	const body = token.slice(0, dot);
	const sig = token.slice(dot + 1);
	const expected = createHmac('sha256', secret).update(body).digest('base64url');
	if (!safeEqual(sig, expected)) return null;
	try {
		const data = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
		if (typeof data.email !== 'string' || typeof data.exp !== 'number') return null;
		if (data.exp < Date.now()) return null;
		if (!isAllowed(data.email)) return null;
		return { email: data.email };
	} catch {
		return null;
	}
}

export function newState(): string {
	return randomBytes(16).toString('base64url');
}

export function googleConfigured(): boolean {
	return Boolean(readEnv('GOOGLE_CLIENT_ID') && readEnv('GOOGLE_CLIENT_SECRET') && authSecret());
}

export function googleAuthUrl(origin: string, state: string): string {
	const params = new URLSearchParams({
		client_id: readEnv('GOOGLE_CLIENT_ID'),
		redirect_uri: `${origin}/auth/callback/google`,
		response_type: 'code',
		scope: 'openid email',
		state,
		prompt: 'select_account'
	});
	return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(
	origin: string,
	code: string
): Promise<{ email: string; emailVerified: boolean }> {
	const body = new URLSearchParams({
		code,
		client_id: readEnv('GOOGLE_CLIENT_ID'),
		client_secret: readEnv('GOOGLE_CLIENT_SECRET'),
		redirect_uri: `${origin}/auth/callback/google`,
		grant_type: 'authorization_code'
	});
	const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body
	});
	if (!tokenRes.ok) throw new Error('Google token exchange failed');
	const token = (await tokenRes.json()) as { access_token?: string };
	if (!token.access_token) throw new Error('Google token exchange failed');

	const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
		headers: { authorization: `Bearer ${token.access_token}` }
	});
	if (!infoRes.ok) throw new Error('Google userinfo failed');
	const info = (await infoRes.json()) as { email?: string; email_verified?: boolean };
	return { email: String(info.email ?? ''), emailVerified: info.email_verified === true };
}

/** Returns false when this key has exceeded the window. */
export function rateLimit(key: string, limit = 10): boolean {
	const now = Date.now();
	const recent = (hits.get(key) ?? []).filter((at) => now - at < RATE_WINDOW_MS);
	if (recent.length >= limit) {
		hits.set(key, recent);
		return false;
	}
	recent.push(now);
	hits.set(key, recent);
	if (hits.size > 5000) {
		const oldest = hits.keys().next().value;
		if (oldest) hits.delete(oldest);
	}
	return true;
}
