import type { PageServerLoad } from './$types';
import { listRepos } from '$lib/server/repos';

export const load: PageServerLoad = async () => {
	const repos = await listRepos();
	return {
		tokenSources: repos.filter((r) => r.hasToken).map((r) => ({ id: r.id, name: r.name }))
	};
};
