import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoOrThrow, updateRepo } from '$lib/server/repos';
import { pullRepo } from '$lib/server/git';

export const POST: RequestHandler = async ({ params }) => {
	try {
		const repo = await getRepoOrThrow(params.id);
		await pullRepo(repo);
		await updateRepo(repo.id, { lastSyncedAt: new Date().toISOString() });
		return json({ ok: true });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Pull failed';
		if (message === 'Repository not found') error(404, message);
		error(400, message);
	}
};
