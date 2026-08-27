import { readFile, writeFile } from 'node:fs/promises';
import type { AppSettings, RepoPublic } from '$lib/types';
import { SETTINGS_PATH, ensureDataDirs } from './paths';

const DEFAULTS: AppSettings = {
	authorName: 'MD Viewer',
	authorEmail: 'md-viewer@localhost',
	defaultRepoId: null
};

export async function getSettings(): Promise<AppSettings> {
	await ensureDataDirs();
	try {
		const raw = await readFile(SETTINGS_PATH, 'utf8');
		const parsed = JSON.parse(raw) as Partial<AppSettings>;
		return {
			authorName: parsed.authorName?.trim() || DEFAULTS.authorName,
			authorEmail: parsed.authorEmail?.trim() || DEFAULTS.authorEmail,
			defaultRepoId:
				typeof parsed.defaultRepoId === 'string' && parsed.defaultRepoId
					? parsed.defaultRepoId
					: null
		};
	} catch {
		return { ...DEFAULTS };
	}
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
	await ensureDataDirs();
	const next: AppSettings = {
		authorName: settings.authorName.trim() || DEFAULTS.authorName,
		authorEmail: settings.authorEmail.trim() || DEFAULTS.authorEmail,
		defaultRepoId: settings.defaultRepoId?.trim() || null
	};
	await writeFile(SETTINGS_PATH, JSON.stringify(next, null, 2), 'utf8');
	return next;
}

/**
 * Resolve which repo to open automatically.
 * - 0 repos → null
 * - 1 repo → that repo (and persist as default if needed)
 * - many → settings.defaultRepoId if it still exists
 */
export async function resolveDefaultRepoId(repos: RepoPublic[]): Promise<string | null> {
	if (repos.length === 0) return null;

	if (repos.length === 1) {
		const onlyId = repos[0].id;
		const settings = await getSettings();
		if (settings.defaultRepoId !== onlyId) {
			await saveSettings({ ...settings, defaultRepoId: onlyId });
		}
		return onlyId;
	}

	const settings = await getSettings();
	if (settings.defaultRepoId && repos.some((r) => r.id === settings.defaultRepoId)) {
		return settings.defaultRepoId;
	}

	if (settings.defaultRepoId) {
		await saveSettings({ ...settings, defaultRepoId: null });
	}
	return null;
}
