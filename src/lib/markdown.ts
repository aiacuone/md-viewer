/** Remove leading YAML front matter (`---` … `---` / `...`) for preview rendering. */
export function stripFrontMatter(content: string): string {
	const match = content.match(/^---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)\r?\n/);
	if (!match) return content;
	return content.slice(match[0].length);
}
