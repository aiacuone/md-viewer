/** Strip .md / .markdown for UI labels (paths stay unchanged). */
export function displayName(name: string): string {
	return name.replace(/\.(md|markdown)$/i, '');
}
