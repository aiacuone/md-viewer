import { env } from '$env/dynamic/private';

// Files the owner's bug reports and feature requests as issues in a private GitHub repo. A screenshot is committed to the
// repo first and linked from the issue, because the issues API cannot take uploads.

export type BugReportConfig = { email: string; token: string; repo: string };

export type BugReport = {
	kind: 'bug' | 'feature';
	title: string;
	description: string;
	page: string;
	userAgent: string;
	screenshot: File | null;
};

const MAX_SCREENSHOT = 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif'
};

/** Only the configured owner sees the form or may file, and only once a token is set. */
export function canReportBugs(config: BugReportConfig, email: string | null | undefined) {
	return !!(config.token && config.email && email && email.trim().toLowerCase() === config.email.trim().toLowerCase());
}

/** Returns the report, or a message saying what is wrong with it. */
export function readBugReport(form: FormData, userAgent: string): BugReport | string {
	const kind = form.get('kind') === 'feature' ? 'feature' : 'bug';
	const title = String(form.get('title') ?? '').trim();
	const description = String(form.get('description') ?? '').trim();
	const page = String(form.get('page') ?? '').trim();
	const file = form.get('screenshot');
	const screenshot = file instanceof File && file.size > 0 ? file : null;
	if (!title) return 'Give it a title.';
	if (title.length > 120) return 'Keep the title under 120 characters.';
	if (description.length > 10_000) return 'The description is too long.';
	if (screenshot && !EXTENSIONS[screenshot.type]) return 'The screenshot must be a JPEG, PNG, WebP or GIF.';
	if (screenshot && screenshot.size > MAX_SCREENSHOT) return 'The screenshot is over 1 MB.';
	return { kind, title, description, page: page.slice(0, 500), userAgent: userAgent.slice(0, 300), screenshot };
}

async function github(config: BugReportConfig, app: string, method: string, path: string, body: unknown) {
	return fetch(`https://api.github.com/repos/${config.repo}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${config.token}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'Content-Type': 'application/json',
			'User-Agent': app
		},
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(20_000)
	});
}

async function failed(res: Response) {
	return new Error(`GitHub answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function uploadScreenshot(config: BugReportConfig, app: string, kind: string, file: File) {
	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	const path = `screenshots/${app}/${stamp}.${EXTENSIONS[file.type]}`;
	const content = Buffer.from(await file.arrayBuffer()).toString('base64');
	const res = await github(config, app, 'PUT', `/contents/${path}`, { message: `Add ${app} ${kind} screenshot`, content });
	if (!res.ok) throw await failed(res);
	const data = (await res.json()) as { content: { html_url: string } };
	return `${data.content.html_url}?raw=true`;
}

/** Files the report and returns the issue's address. */
export async function fileBugReport(config: BugReportConfig, app: string, report: BugReport) {
	const screenshot = report.screenshot ? await uploadScreenshot(config, app, report.kind, report.screenshot) : null;
	const body = [
		report.description || '_No description._',
		'',
		`**Type:** ${report.kind === 'feature' ? 'Feature request' : 'Bug'}`,
		`**App:** ${app}`,
		`**Page:** ${report.page || 'not given'}`,
		`**Browser:** ${report.userAgent || 'unknown'}`,
		`**Reported:** ${new Date().toISOString()}`,
		...(screenshot ? ['', `![Screenshot](${screenshot})`] : [])
	].join('\n');
	const issue = { title: `[${app}] ${report.title}`, body, labels: [report.kind === 'feature' ? 'enhancement' : 'bug', app] };

	let res = await github(config, app, 'POST', '/issues', issue);
	// A missing label is a 422; file the issue without labels rather than lose the report.
	if (res.status === 422) res = await github(config, app, 'POST', '/issues', { ...issue, labels: undefined });
	if (!res.ok) throw await failed(res);
	return ((await res.json()) as { html_url: string }).html_url;
}

/** Owner, token and target repo from the server's environment file. */
export function bugReportConfig(): BugReportConfig {
	return {
		email: env.BUG_REPORT_EMAIL ?? '',
		token: env.BUG_REPORT_TOKEN ?? '',
		repo: env.BUG_REPORT_REPO || 'aiacuone/bugs'
	};
}
