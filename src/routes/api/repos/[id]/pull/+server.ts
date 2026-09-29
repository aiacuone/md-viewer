import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoOrThrow, updateRepo } from '$lib/server/repos';
import { DIVERGED_CODE, pullRepo } from '$lib/server/git';

export const POST: RequestHandler = async ({ params }) => {
	try {
		const repo = await getRepoOrThrow(params.id);
		await pullRepo(repo);
		await updateRepo(repo.id, { lastSyncedAt: new Date().toISOString() });
		return json({ ok: true });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Pull failed';
		const code = (err as Error & { code?: string })?.code;
		if (message === 'Repository not found') error(404, message);
		return json({ message, code: code === DIVERGED_CODE ? DIVERGED_CODE : undefined }, { status: 400 });
	}
};
