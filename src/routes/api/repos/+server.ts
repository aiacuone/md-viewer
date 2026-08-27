import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addRepoMeta, listRepos, rollbackAdd, toPublic, updateRepo } from '$lib/server/repos';
import { cloneRepo } from '$lib/server/git';

export const GET: RequestHandler = async () => {
	return json(await listRepos());
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const remoteUrl = String(body.remoteUrl ?? '').trim();
	if (!remoteUrl) {
		error(400, 'remoteUrl is required');
	}
	if (!/^https:\/\//i.test(remoteUrl)) {
		error(400, 'Only HTTPS remote URLs are supported');
	}

	const meta = await addRepoMeta({
		remoteUrl,
		name: body.name,
		contentRoot: body.contentRoot,
		token: body.token,
		tokenFromRepoId: body.tokenFromRepoId,
		defaultBranch: body.defaultBranch
	});

	try {
		await cloneRepo(meta);
		const updated = await updateRepo(meta.id, {
			defaultBranch: meta.defaultBranch,
			lastSyncedAt: new Date().toISOString()
		});

		const repos = await listRepos();
		if (repos.length === 1) {
			const { getSettings, saveSettings } = await import('$lib/server/settings');
			const settings = await getSettings();
			await saveSettings({ ...settings, defaultRepoId: updated.id });
		}

		return json(toPublic(updated), { status: 201 });
	} catch (err) {
		await rollbackAdd(meta.id);
		const message = err instanceof Error ? err.message : 'Clone failed';
		error(400, message);
	}
};
