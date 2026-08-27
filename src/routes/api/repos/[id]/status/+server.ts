import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoOrThrow } from '$lib/server/repos';
import { getSyncStatus } from '$lib/server/git';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const repo = await getRepoOrThrow(params.id);
		return json(await getSyncStatus(repo));
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to get status';
		if (message === 'Repository not found') error(404, message);
		error(400, message);
	}
};
