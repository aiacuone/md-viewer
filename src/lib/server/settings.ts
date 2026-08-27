import { readFile, writeFile } from 'node:fs/promises';
import type { AppSettings } from '$lib/types';
import { SETTINGS_PATH, ensureDataDirs } from './paths';

const DEFAULTS: AppSettings = {
	authorName: 'MD Viewer',
	authorEmail: 'md-viewer@localhost'
};

export async function getSettings(): Promise<AppSettings> {
	await ensureDataDirs();
	try {
		const raw = await readFile(SETTINGS_PATH, 'utf8');
		return { ...DEFAULTS, ...JSON.parse(raw) };
	} catch {
		return { ...DEFAULTS };
	}
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
	await ensureDataDirs();
	const next = {
		authorName: settings.authorName.trim() || DEFAULTS.authorName,
		authorEmail: settings.authorEmail.trim() || DEFAULTS.authorEmail
	};
	await writeFile(SETTINGS_PATH, JSON.stringify(next, null, 2), 'utf8');
	return next;
}
