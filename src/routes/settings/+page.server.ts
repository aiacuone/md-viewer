import type { PageServerLoad } from './$types';
import { listRepos } from '$lib/server/repos';
import { getSettings } from '$lib/server/settings';

export const load: PageServerLoad = async () => {
	const [settings, repos] = await Promise.all([getSettings(), listRepos()]);
	return { settings, repos };
};
