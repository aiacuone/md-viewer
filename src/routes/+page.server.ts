import type { PageServerLoad } from './$types';
import { listRepos } from '$lib/server/repos';

export const load: PageServerLoad = async () => {
	return { repos: await listRepos() };
};
