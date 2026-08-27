import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSettings, saveSettings } from '$lib/server/settings';

export const GET: RequestHandler = async () => {
	return json(await getSettings());
};

export const PUT: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const saved = await saveSettings({
		authorName: String(body.authorName ?? ''),
		authorEmail: String(body.authorEmail ?? '')
	});
	return json(saved);
};
