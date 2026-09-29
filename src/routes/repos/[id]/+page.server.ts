import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRepo, toPublic, updateRepo } from '$lib/server/repos';
import { listTree, autoPullIfBehind } from '$lib/server/git';
import { getFavouritesForRepo } from '$lib/server/settings';

export const load: PageServerLoad = async ({ params, url }) => {
	const repo = await getRepo(params.id);
	if (!repo) error(404, 'Repository not found');
	const path = url.searchParams.get('path') ?? '';

	const { status, pulled } = await autoPullIfBehind(repo);
	if (pulled) {
		await updateRepo(repo.id, { lastSyncedAt: new Date().toISOString() });
	}

	const [tree, favourites] = await Promise.all([
		listTree(repo, path),
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
