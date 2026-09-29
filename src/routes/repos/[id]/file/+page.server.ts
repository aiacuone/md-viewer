import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRepo, toPublic, updateRepo } from '$lib/server/repos';
import { readMarkdownFile, autoPullIfBehind } from '$lib/server/git';
import { getFavouritesForRepo } from '$lib/server/settings';

export const load: PageServerLoad = async ({ params, url }) => {
	const path = url.searchParams.get('path');
	if (!path) error(400, 'path is required');
	const repo = await getRepo(params.id);
	if (!repo) error(404, 'Repository not found');

	const { status, pulled } = await autoPullIfBehind(repo);
	if (pulled) {
		await updateRepo(repo.id, { lastSyncedAt: new Date().toISOString() });
	}

	// Re-read after possible pull so content matches remote
	const [content, favourites] = await Promise.all([
		readMarkdownFile(repo, path),
		getFavouritesForRepo(repo.id)
	]);
	return {
		repo: toPublic(repo),
		path,
		content,
		status,
		favourites
	};
};
