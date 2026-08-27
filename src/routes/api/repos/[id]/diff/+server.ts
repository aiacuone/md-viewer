import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoOrThrow } from '$lib/server/repos';
import { getDiffs } from '$lib/server/git';

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const repo = await getRepoOrThrow(params.id);
		const path = url.searchParams.get('path') ?? undefined;
		return json(await getDiffs(repo, path || undefined));
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to diff';
		if (message === 'Repository not found') error(404, message);
		error(400, message);
	}
};
