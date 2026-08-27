import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoOrThrow } from '$lib/server/repos';
import { toggleFavourite } from '$lib/server/settings';
import { fail } from '$lib/server/http';

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		await getRepoOrThrow(params.id);
		const body = await request.json();
		const path = typeof body.path === 'string' ? body.path : '';
		const favourites = await toggleFavourite(params.id, path);
		const normalized = path.trim().replace(/^\/+|\/+$/g, '').replace(/\\/g, '/');
		return json({
			favourites,
			favourited: favourites.includes(normalized)
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to update favourite';
		const status = message === 'Repository not found' ? 404 : 400;
		return fail(status, message);
	}
};
