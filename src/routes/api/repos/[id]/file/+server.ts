import { json, error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoOrThrow, markSynced } from '$lib/server/repos';
import {
	readMarkdownFile,
	readMarkdownFileAtHead,
	writeMarkdownFile,
	deleteMarkdownFileAndSync
} from '$lib/server/git';
import { removeFavouritePath } from '$lib/server/settings';
import { failFrom } from '$lib/server/http';

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const repo = await getRepoOrThrow(params.id);
		const pathParam = url.searchParams.get('path');
		if (!pathParam) error(400, 'path is required');
		const ref = url.searchParams.get('ref');
		if (ref === 'HEAD') {
			const content = await readMarkdownFileAtHead(repo, pathParam);
			if (content === null) error(404, 'File not found at HEAD');
			return json({ path: pathParam, content, ref: 'HEAD' });
		}
		const content = await readMarkdownFile(repo, pathParam);
		return json({ path: pathParam, content });
	} catch (err) {
		return failFrom(err, 'Failed to read file');
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const repo = await getRepoOrThrow(params.id);
		const body = await request.json();
		const path = String(body.path ?? '');
		const content = String(body.content ?? '');
		if (!path) error(400, 'path is required');
		await writeMarkdownFile(repo, path, content);
		return json({ ok: true, path });
	} catch (err) {
		return failFrom(err, 'Failed to save file');
	}
};

export const DELETE: RequestHandler = async ({ params, url }) => {
	let sha: string | undefined;
	try {
		const repo = await getRepoOrThrow(params.id);
		const pathParam = url.searchParams.get('path');
		if (!pathParam) error(400, 'path is required');

		const result = await deleteMarkdownFileAndSync(repo, pathParam);
		sha = result.sha;
		await removeFavouritePath(repo.id, pathParam);
		if (result.committed) {
			await markSynced(repo.id);
		}
		return json({ ok: true, path: pathParam, committed: result.committed, sha });
	} catch (err) {
		if (sha && !isHttpError(err)) {
			const message = err instanceof Error ? err.message : 'Push failed';
			error(400, `Deleted and committed (${sha.slice(0, 7)}) but push failed: ${message}`);
		}
		return failFrom(err, 'Failed to delete file');
	}
};
