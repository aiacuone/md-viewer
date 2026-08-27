import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRepo, toPublic } from '$lib/server/repos';
import { listTree, getSyncStatus } from '$lib/server/git';
import { getFavouritesForRepo } from '$lib/server/settings';

export const load: PageServerLoad = async ({ params, url }) => {
	const repo = await getRepo(params.id);
	if (!repo) error(404, 'Repository not found');
	const path = url.searchParams.get('path') ?? '';
	const [tree, status, favourites] = await Promise.all([
		listTree(repo, path),
		getSyncStatus(repo),
		getFavouritesForRepo(repo.id)
	]);
	return {
		repo: toPublic(repo),
		path,
		tree,
		status,
		favourites
	};
};
