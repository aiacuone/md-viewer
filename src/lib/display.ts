/** Strip .md / .markdown for UI labels (paths stay unchanged). */
export function displayName(name: string): string {
	return name.replace(/\.(md|markdown)$/i, '');
}

export function isRootScopedPath(path: string): boolean {
	return path === '@root' || path.startsWith('@root/');
}

export function treeEntryLabel(entry: { name: string; path: string; type: 'file' | 'dir' }): string {
	if (entry.type === 'dir') return entry.name;
	const label = displayName(entry.name);
	return isRootScopedPath(entry.path) ? `${label} (repo root)` : label;
}
