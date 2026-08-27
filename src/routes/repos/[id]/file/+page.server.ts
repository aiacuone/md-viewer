import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRepo, toPublic } from '$lib/server/repos';
import { readMarkdownFile, getSyncStatus } from '$lib/server/git';

export const load: PageServerLoad = async ({ params, url }) => {
	const path = url.searchParams.get('path');
	if (!path) error(400, 'path is required');
	const repo = await getRepo(params.id);
	if (!repo) error(404, 'Repository not found');
	const [content, status] = await Promise.all([
		readMarkdownFile(repo, path),
		getSyncStatus(repo)
	]);
	return {
		repo: toPublic(repo),
		path,
		content,
		status
	};
};
