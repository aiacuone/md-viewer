import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listRepos } from '$lib/server/repos';
import { getSettings, resolveDefaultRepoId } from '$lib/server/settings';

export const load: PageServerLoad = async ({ url }) => {
	const repos = await listRepos();
	const settings = await getSettings();
	const showList = url.searchParams.get('list') === '1';

	if (!showList) {
		const defaultId = await resolveDefaultRepoId(repos);
		if (defaultId) {
			redirect(303, `/repos/${defaultId}`);
		}
	}

	return {
		repos,
		defaultRepoId: settings.defaultRepoId
	};
};
