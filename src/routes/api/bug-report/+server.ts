import { error, json } from '@sveltejs/kit';
import { bugReportConfig, canReportBugs, fileBugReport, readBugReport } from '$lib/server/bug-report';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const { locals, request } = event;
	const config = bugReportConfig();
	if (!canReportBugs(config, locals.user?.email)) error(403, 'Bug reports are only for the owner.');
	const report = readBugReport(await request.formData(), request.headers.get('user-agent') ?? '');
	if (typeof report === 'string') error(400, report);
	try {
		return json({ url: await fileBugReport(config, 'md-viewer', report) });
	} catch (err) {
		console.error('bug report not filed:', err);
		error(502, 'GitHub did not take the report. Your text is still in the form, so try again.');
	}
};
