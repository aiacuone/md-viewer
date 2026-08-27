import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoOrThrow } from '$lib/server/repos';
import { readMarkdownFile, readMarkdownFileAtHead, writeMarkdownFile } from '$lib/server/git';

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
		const message = err instanceof Error ? err.message : 'Failed to read file';
		if (message === 'Repository not found') error(404, message);
		error(400, message);
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
		const message = err instanceof Error ? err.message : 'Failed to save file';
		if (message === 'Repository not found') error(404, message);
		error(400, message);
	}
};
