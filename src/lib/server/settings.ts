import { readFile, writeFile } from 'node:fs/promises';
import type { AppSettings, RepoPublic } from '$lib/types';
import { SETTINGS_PATH, ensureDataDirs } from './paths';

const DEFAULTS: AppSettings = {
	authorName: 'MD Viewer',
	authorEmail: 'md-viewer@localhost',
	defaultRepoId: null,
	favouritesByRepo: {}
};

function normalizeFavourites(raw: unknown): Record<string, string[]> {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
	const out: Record<string, string[]> = {};
	for (const [repoId, paths] of Object.entries(raw as Record<string, unknown>)) {
		if (!repoId || !Array.isArray(paths)) continue;
		const cleaned = [
			...new Set(
				paths
					.filter((p): p is string => typeof p === 'string')
					.map((p) => p.trim().replace(/^\/+|\/+$/g, '').replace(/\\/g, '/'))
					.filter(Boolean)
			)
		];
		if (cleaned.length) out[repoId] = cleaned;
	}
	return out;
}

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
					: null,
			favouritesByRepo: normalizeFavourites(parsed.favouritesByRepo)
		};
	} catch {
		return { ...DEFAULTS, favouritesByRepo: {} };
	}
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
	await ensureDataDirs();
	const next: AppSettings = {
		authorName: settings.authorName.trim() || DEFAULTS.authorName,
		authorEmail: settings.authorEmail.trim() || DEFAULTS.authorEmail,
		defaultRepoId: settings.defaultRepoId?.trim() || null,
		favouritesByRepo: normalizeFavourites(settings.favouritesByRepo)
	};
	await writeFile(SETTINGS_PATH, JSON.stringify(next, null, 2), 'utf8');
	return next;
}

export async function getFavouritesForRepo(repoId: string): Promise<string[]> {
	const settings = await getSettings();
	return settings.favouritesByRepo[repoId] ?? [];
}

/** Toggle a path in the repo's favourites list. Returns the updated list. */
export async function toggleFavourite(repoId: string, path: string): Promise<string[]> {
	const normalized = path.trim().replace(/^\/+|\/+$/g, '').replace(/\\/g, '/');
	if (!normalized) throw new Error('path is required');

	const settings = await getSettings();
	const current = settings.favouritesByRepo[repoId] ?? [];
	const exists = current.includes(normalized);
	const next = exists ? current.filter((p) => p !== normalized) : [...current, normalized];

	const favouritesByRepo = { ...settings.favouritesByRepo };
	if (next.length === 0) delete favouritesByRepo[repoId];
	else favouritesByRepo[repoId] = next;

	await saveSettings({ ...settings, favouritesByRepo });
	return next;
}

export async function clearFavouritesForRepo(repoId: string): Promise<void> {
	const settings = await getSettings();
	if (!(repoId in settings.favouritesByRepo)) return;
	const favouritesByRepo = { ...settings.favouritesByRepo };
	delete favouritesByRepo[repoId];
	await saveSettings({ ...settings, favouritesByRepo });
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
