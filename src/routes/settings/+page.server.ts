import type { PageServerLoad } from './$types';
import { getSettings, toPublicSettings } from '$lib/server/settings';

export const load: PageServerLoad = async () => {
	return { settings: toPublicSettings(await getSettings()) };
};
