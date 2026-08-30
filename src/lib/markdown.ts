import { Marked } from 'marked';

/** Remove leading YAML front matter (`---` … `---` / `...`) for preview rendering. */
export function stripFrontMatter(content: string): string {
	const match = content.match(/^---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)\r?\n/);
	if (!match) return content;
	return content.slice(match[0].length);
}

export type RenderMarkdownOptions = {
	repoId: string;
	filePath: string;
	contentRoot?: string;
};

const EXTERNAL_HREF = /^(https?:|mailto:|tel:)/i;
const MARKDOWN_EXT = /\.(md|markdown)$/i;

function escapeAttr(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function dirname(filePath: string): string {
	const parts = filePath.split('/').filter(Boolean);
	parts.pop();
	return parts.join('/');
}

/** Posix-style path normalize (no leading slash). */
function normalizePosix(path: string): string {
	const parts: string[] = [];
	for (const part of path.replace(/\\/g, '/').split('/')) {
		if (!part || part === '.') continue;
		if (part === '..') {
			parts.pop();
			continue;
		}
		parts.push(part);
	}
	return parts.join('/');
}

function splitHash(href: string): { path: string; hash: string } {
	const i = href.indexOf('#');
	if (i === -1) return { path: href, hash: '' };
	return { path: href.slice(0, i), hash: href.slice(i) };
}

function resolveDocPath(hrefPath: string, filePath: string, contentRoot?: string): string {
	const cleaned = hrefPath.replace(/\\/g, '/');
	if (filePath.startsWith('@root/')) {
		const repoPath = normalizePosix(cleaned.startsWith('/') ? cleaned.slice(1) : cleaned);
		if (contentRoot) {
			const root = contentRoot.replace(/^\/+|\/+$/g, '');
			if (repoPath === root) return '.';
			if (repoPath.startsWith(`${root}/`)) {
				return repoPath.slice(root.length + 1);
			}
		}
		if (/^readme\.(md|markdown)$/i.test(repoPath)) {
			return `@root/${repoPath}`;
		}
		return repoPath;
	}
	if (cleaned.startsWith('/')) {
		return normalizePosix(cleaned.slice(1));
	}
	const base = dirname(filePath);
	const joined = base ? `${base}/${cleaned}` : cleaned;
	return normalizePosix(joined);
}

/** Rewrite markdown hrefs for in-app navigation / safe external opens. */
export function rewriteHref(href: string, { repoId, filePath, contentRoot }: RenderMarkdownOptions): {
	href: string;
	external: boolean;
} {
	if (!href) return { href: '', external: false };

	if (EXTERNAL_HREF.test(href)) {
		return { href, external: true };
	}

	if (href.startsWith('#')) {
		return { href, external: false };
	}

	const { path, hash } = splitHash(href);
	if (!path) {
		return { href, external: false };
	}

	if (MARKDOWN_EXT.test(path)) {
		const resolved = resolveDocPath(path, filePath, contentRoot);
		return {
			href: `/repos/${repoId}/file?path=${encodeURIComponent(resolved)}${hash}`,
			external: false
		};
	}

	return { href, external: false };
}

/** Parse markdown to HTML with link rewriting for the file viewer. */
export function renderMarkdown(content: string, opts: RenderMarkdownOptions): string {
	const marked = new Marked({
		renderer: {
			link({ href, title, tokens }) {
				const text = this.parser.parseInline(tokens);
				const { href: nextHref, external } = rewriteHref(href ?? '', opts);
				let out = `<a href="${escapeAttr(nextHref)}"`;
				if (title) {
					out += ` title="${escapeAttr(title)}"`;
				}
				if (external) {
					out += ' target="_blank" rel="noopener noreferrer"';
				}
				out += `>${text}</a>`;
				return out;
			}
		}
	});

	return marked.parse(stripFrontMatter(content), { async: false }) as string;
}
