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

/** UI path prefix for markdown files outside the configured content root (e.g. repo README). */
export const ROOT_SCOPE = '@root';

export function isRootScopedPath(relativePath: string): boolean {
	return relativePath === ROOT_SCOPE || relativePath.startsWith(`${ROOT_SCOPE}/`);
}

export function toRootScopedPath(repoRelativePath: string): string {
	const cleaned = repoRelativePath.replace(/^\/+|\/+$/g, '').replace(/\\/g, '/');
	return cleaned ? `${ROOT_SCOPE}/${cleaned}` : ROOT_SCOPE;
}

export function fromRootScopedPath(relativePath: string): string {
	if (!isRootScopedPath(relativePath)) return relativePath;
	return relativePath === ROOT_SCOPE ? '' : relativePath.slice(ROOT_SCOPE.length + 1);
}

/** Resolve a UI path to absolute + repo-relative paths (content root or @root scope). */
export function resolveMarkdownPath(
	repoRoot: string,
	contentRoot: string,
	relativePath: string
): { absolute: string; repoRelative: string } {
	if (isRootScopedPath(relativePath)) {
		const repoRelative = fromRootScopedPath(relativePath).replace(/\\/g, '/');
		const absolute = path.resolve(repoRoot, repoRelative);
		const normalizedRoot = path.resolve(repoRoot);
		if (absolute !== normalizedRoot && !absolute.startsWith(normalizedRoot + path.sep)) {
			throw new Error('Path escapes repository');
		}
		return { absolute, repoRelative };
	}

	const absolute = resolveContentPath(repoRoot, contentRoot, relativePath);
	return { absolute, repoRelative: toRepoRelative(repoRoot, absolute) };
}

export async function ensureDataDirs(): Promise<void> {
	await mkdir(REPOS_DIR, { recursive: true });
}
