import type { SyncStatus } from '$lib/types';

/** Branch on the first line, clean or pending state on the second. */
export function syncCaption(status: SyncStatus | null): { branch: string; detail: string } {
	if (!status) return { branch: '…', detail: 'Loading' };
	if (status.uncommitted.length) {
		const count = status.uncommitted.length;
		return { branch: status.branch, detail: `${count} uncommitted` };
	}
	const extra: string[] = [];
	if (status.ahead) extra.push(`ahead ${status.ahead}`);
	if (status.behind) extra.push(`behind ${status.behind}`);
	return { branch: status.branch, detail: extra.length ? extra.join(' · ') : 'Clean working tree' };
}

/** Strip .md / .markdown for UI labels (paths stay unchanged). */
export function displayName(name: string): string {
	return name.replace(/\.(md|markdown)$/i, '');
}

/** UI path prefix for markdown files outside the configured content root (e.g. repo README). */
export const ROOT_SCOPE = '@root';

export function isRootScopedPath(path: string): boolean {
	return path === ROOT_SCOPE || path.startsWith(`${ROOT_SCOPE}/`);
}

export function treeEntryLabel(entry: { name: string; path: string; type: 'file' | 'dir' }): string {
	if (entry.type === 'dir') return entry.name;
	const label = displayName(entry.name);
	return isRootScopedPath(entry.path) ? `${label} (repo root)` : label;
}
