import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoOrThrow } from '$lib/server/repos';
import { normalizeFavouritePath, toggleFavourite } from '$lib/server/settings';
import { failFrom } from '$lib/server/http';

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		await getRepoOrThrow(params.id);
		const body = await request.json();
		const path = typeof body.path === 'string' ? body.path : '';
		const favourites = await toggleFavourite(params.id, path);
		return json({
			favourites,
			favourited: favourites.includes(normalizeFavouritePath(path))
		});
	} catch (err) {
		return failFrom(err, 'Failed to update favourite');
	}
};
