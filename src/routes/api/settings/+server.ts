import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSettings, saveSettings } from '$lib/server/settings';
import { listRepos } from '$lib/server/repos';

export const GET: RequestHandler = async () => {
	return json(await getSettings());
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
	const saved = await saveSettings({
		authorName: String(body.authorName ?? current.authorName),
		authorEmail: String(body.authorEmail ?? current.authorEmail),
		defaultRepoId
	});
	return json(saved);
};
