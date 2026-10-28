import type { PageServerLoad } from './$types';
import { bugReportConfig, canReportBugs } from '$lib/server/bug-report';
import { getSettings, toPublicSettings } from '$lib/server/settings';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		settings: toPublicSettings(await getSettings()),
		canReportBugs: canReportBugs(bugReportConfig(), locals.user?.email)
	};
};
