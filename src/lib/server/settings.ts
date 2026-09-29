import { readFile, writeFile } from 'node:fs/promises';
import type { AppSettings, RepoPublic, SettingsPublic } from '$lib/types';
import { META_PATH, SETTINGS_PATH, ensureDataDirs } from './paths';

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

export function toPublicSettings(settings: AppSettings): SettingsPublic {
	const { token: _token, aiKey: _aiKey, ...rest } = settings;
	return {
		...rest,
		hasToken: Boolean(settings.token?.trim()),
		hasAiKey: Boolean(settings.aiKey?.trim())
	};
}

/**
 * Promote any legacy per-repo tokens into app settings, then strip them from repos.json.
 * Returns a token to use when settings does not already have one.
 */
async function migrateRepoTokens(existingToken?: string): Promise<string | undefined> {
	await ensureDataDirs();
	let repos: Array<Record<string, unknown>>;
	try {
		const raw = await readFile(META_PATH, 'utf8');
		const data = JSON.parse(raw);
		if (!Array.isArray(data)) return existingToken?.trim() || undefined;
		repos = data;
	} catch {
		return existingToken?.trim() || undefined;
	}

	let promoted: string | undefined;
	let changed = false;
	const cleaned = repos.map((repo) => {
		const token = typeof repo.token === 'string' ? repo.token.trim() : '';
		if (token) {
			if (!promoted) promoted = token;
			changed = true;
			const { token: _removed, ...rest } = repo;
			return rest;
		}
		return repo;
	});

	if (changed) {
		await writeFile(META_PATH, JSON.stringify(cleaned, null, 2), 'utf8');
	}

	const kept = existingToken?.trim() || undefined;
	return kept || promoted;
}

export async function getSettings(): Promise<AppSettings> {
	await ensureDataDirs();
	let parsed: Partial<AppSettings> = {};
	try {
		const raw = await readFile(SETTINGS_PATH, 'utf8');
		parsed = JSON.parse(raw) as Partial<AppSettings>;
	} catch {
		parsed = {};
	}

	const fileToken = typeof parsed.token === 'string' ? parsed.token.trim() : undefined;
	const token = await migrateRepoTokens(fileToken);
	const aiKey = typeof parsed.aiKey === 'string' ? parsed.aiKey.trim() : undefined;

	const settings: AppSettings = {
		authorName: parsed.authorName?.trim() || DEFAULTS.authorName,
		authorEmail: parsed.authorEmail?.trim() || DEFAULTS.authorEmail,
		defaultRepoId:
			typeof parsed.defaultRepoId === 'string' && parsed.defaultRepoId
				? parsed.defaultRepoId
				: null,
		favouritesByRepo: normalizeFavourites(parsed.favouritesByRepo),
		...(token ? { token } : {}),
		...(aiKey ? { aiKey } : {})
	};

	// Persist promoted token if settings file lacked one
	if (token && !fileToken) {
		await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
	}

	return settings;
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
	await ensureDataDirs();
	const token = settings.token?.trim() || undefined;
	const aiKey = settings.aiKey?.trim() || undefined;
	const next: AppSettings = {
		authorName: settings.authorName.trim() || DEFAULTS.authorName,
		authorEmail: settings.authorEmail.trim() || DEFAULTS.authorEmail,
		defaultRepoId: settings.defaultRepoId?.trim() || null,
		favouritesByRepo: normalizeFavourites(settings.favouritesByRepo),
		...(token ? { token } : {}),
		...(aiKey ? { aiKey } : {})
	};
	await writeFile(SETTINGS_PATH, JSON.stringify(next, null, 2), 'utf8');
	return next;
}

export async function getGitToken(): Promise<string | undefined> {
	const settings = await getSettings();
	return settings.token?.trim() || undefined;
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

/** Drop a path from favourites if present (e.g. after file delete). */
export async function removeFavouritePath(repoId: string, path: string): Promise<void> {
	const normalized = path.trim().replace(/^\/+|\/+$/g, '').replace(/\\/g, '/');
	if (!normalized) return;
	const settings = await getSettings();
	const current = settings.favouritesByRepo[repoId] ?? [];
	if (!current.includes(normalized)) return;
	const next = current.filter((p) => p !== normalized);
	const favouritesByRepo = { ...settings.favouritesByRepo };
	if (next.length === 0) delete favouritesByRepo[repoId];
	else favouritesByRepo[repoId] = next;
	await saveSettings({ ...settings, favouritesByRepo });
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
