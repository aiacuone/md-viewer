import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSettings, saveSettings, toPublicSettings } from '$lib/server/settings';
import { listRepos } from '$lib/server/repos';

export const GET: RequestHandler = async () => {
	return json(toPublicSettings(await getSettings()));
};

export const PUT: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const repos = await listRepos();
	let defaultRepoId: string | null =
		body.defaultRepoId === null || body.defaultRepoId === undefined || body.defaultRepoId === ''
			? null
			: String(body.defaultRepoId);

	if (repos.length === 1) {
		defaultRepoId = repos[0].id;
	} else if (defaultRepoId && !repos.some((r) => r.id === defaultRepoId)) {
		defaultRepoId = null;
	}

	const current = await getSettings();
	let token = current.token;
	if (body.clearToken === true) {
		token = undefined;
	} else if (typeof body.token === 'string' && body.token.trim()) {
		token = body.token.trim();
	}

	let aiKey = current.aiKey;
	if (body.clearAiKey === true) {
		aiKey = undefined;
	} else if (typeof body.aiKey === 'string' && body.aiKey.trim()) {
		aiKey = body.aiKey.trim();
	}

	const saved = await saveSettings({
		authorName: String(body.authorName ?? current.authorName),
		authorEmail: String(body.authorEmail ?? current.authorEmail),
		defaultRepoId,
		favouritesByRepo:
			body.favouritesByRepo !== undefined ? body.favouritesByRepo : current.favouritesByRepo,
		...(token ? { token } : {}),
		...(aiKey ? { aiKey } : {})
	});
	return json(toPublicSettings(saved));
};
