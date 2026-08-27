import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoOrThrow } from '$lib/server/repos';
import { commitAll } from '$lib/server/git';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const repo = await getRepoOrThrow(params.id);
		const body = await request.json();
		const message = String(body.message ?? '').trim();
		if (!message) error(400, 'Commit message is required');
		const sha = await commitAll(repo, message);
		return json({ ok: true, sha });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Commit failed';
		if (message === 'Repository not found') error(404, message);
		error(400, message);
	}
};
