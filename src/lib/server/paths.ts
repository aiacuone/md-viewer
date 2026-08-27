import { mkdir } from 'node:fs/promises';
import path from 'node:path';

export const DATA_DIR = path.resolve('data');
export const REPOS_DIR = path.join(DATA_DIR, 'repos');
export const META_PATH = path.join(DATA_DIR, 'repos.json');
export const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');

export function repoDir(id: string): string {
	return path.join(REPOS_DIR, id);
}

/** Resolve a UI-relative path under content root; rejects traversal. */
export function resolveContentPath(
	repoRoot: string,
	contentRoot: string,
	relativePath = ''
): string {
	const base = contentRoot ? path.join(repoRoot, contentRoot) : repoRoot;
	const target = path.resolve(base, relativePath);
	const normalizedBase = path.resolve(base);
	if (target !== normalizedBase && !target.startsWith(normalizedBase + path.sep)) {
		throw new Error('Path escapes content root');
	}
	return target;
}

export function toRepoRelative(repoRoot: string, absolutePath: string): string {
	return path.relative(repoRoot, absolutePath).split(path.sep).join('/');
}

export async function ensureDataDirs(): Promise<void> {
	await mkdir(REPOS_DIR, { recursive: true });
}
