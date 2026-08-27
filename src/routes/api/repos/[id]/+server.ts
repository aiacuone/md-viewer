import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepo, removeRepo, toPublic } from '$lib/server/repos';

export const GET: RequestHandler = async ({ params }) => {
	const repo = await getRepo(params.id);
	if (!repo) error(404, 'Repository not found');
	return json(toPublic(repo));
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		await removeRepo(params.id);
		return json({ ok: true });
	} catch {
		error(404, 'Repository not found');
	}
};
