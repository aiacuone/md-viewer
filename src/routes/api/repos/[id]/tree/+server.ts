import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoOrThrow } from '$lib/server/repos';
import { listTree } from '$lib/server/git';
import { failFrom } from '$lib/server/http';

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const repo = await getRepoOrThrow(params.id);
		const path = url.searchParams.get('path') ?? '';
		return json(await listTree(repo, path));
	} catch (err) {
		return failFrom(err, 'Failed to list tree');
	}
};
