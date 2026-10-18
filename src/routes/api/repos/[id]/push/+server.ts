import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoOrThrow, markSynced } from '$lib/server/repos';
import { pushRepo } from '$lib/server/git';
import { failFrom } from '$lib/server/http';

export const POST: RequestHandler = async ({ params }) => {
	try {
		const repo = await getRepoOrThrow(params.id);
		await pushRepo(repo);
		await markSynced(repo.id);
		return json({ ok: true });
	} catch (err) {
		return failFrom(err, 'Push failed');
	}
};
