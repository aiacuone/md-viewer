import { json, error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoOrThrow, updateRepo } from '$lib/server/repos';
import { commitAll, pushRepo } from '$lib/server/git';

export const POST: RequestHandler = async ({ params, request }) => {
	let sha: string | undefined;
	try {
		const repo = await getRepoOrThrow(params.id);
		const body = await request.json();
		const message = String(body.message ?? '').trim();
		if (!message) error(400, 'Commit message is required');
		sha = await commitAll(repo, message);
		await pushRepo(repo);
		await updateRepo(repo.id, { lastSyncedAt: new Date().toISOString() });
		return json({ ok: true, sha });
	} catch (err) {
		if (isHttpError(err)) throw err;
		const message = err instanceof Error ? err.message : 'Commit failed';
		if (message === 'Repository not found') error(404, message);
		if (sha) error(400, `Committed (${sha.slice(0, 7)}) but push failed: ${message}`);
		error(400, message);
	}
};
