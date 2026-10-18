import { json, error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoOrThrow, markSynced } from '$lib/server/repos';
import { commitAll, pushRepo } from '$lib/server/git';
import { failFrom } from '$lib/server/http';

export const POST: RequestHandler = async ({ params, request }) => {
	let sha: string | undefined;
	try {
		const repo = await getRepoOrThrow(params.id);
		const body = await request.json();
		const message = String(body.message ?? '').trim();
		if (!message) error(400, 'Commit message is required');
		sha = await commitAll(repo, message);
		await pushRepo(repo);
		await markSynced(repo.id);
		return json({ ok: true, sha });
	} catch (err) {
		if (sha && !isHttpError(err)) {
			const message = err instanceof Error ? err.message : 'Push failed';
			error(400, `Committed (${sha.slice(0, 7)}) but push failed: ${message}`);
		}
		return failFrom(err, 'Commit failed');
	}
};
