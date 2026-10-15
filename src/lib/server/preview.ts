import fs from 'node:fs';
import path from 'node:path';
import { renderMarkdown } from '$lib/markdown';
import { displayName } from '$lib/display';
const ROOT = path.resolve('preview');

export type PreviewNode =
	| {
			kind: 'dir';
			path: string;
			title: string;
			entries: { name: string; path: string; type: 'file' | 'dir' }[];
	  }
	| {
			kind: 'file';
			path: string;
			title: string;
			html: string;
			parent: string;
	  };

function realRoot(): string {
	return fs.realpathSync(ROOT);
}

function resolveInside(rel: string): string {
	const root = realRoot();
	const full = path.resolve(root, rel);
	if (full !== root && !full.startsWith(root + path.sep)) {
		throw new Error('Invalid preview path');
	}
	return full;
}

function urlPath(relFile: string): string {
	return relFile.replace(/\.md$/i, '').replace(/\\/g, '/');
}

export function previewEntryParams(): { path: string }[] {
	const out: { path: string }[] = [{ path: '' }];
	const walk = (rel: string) => {
		const dir = resolveInside(rel);
		for (const name of fs.readdirSync(dir)) {
			if (name.startsWith('.')) continue;
			const child = rel ? `${rel}/${name}` : name;
			const stat = fs.statSync(resolveInside(child));
			if (stat.isDirectory()) {
				out.push({ path: child });
				walk(child);
			} else if (name.endsWith('.md')) {
				out.push({ path: urlPath(child) });
			}
		}
	};
	walk('');
	return out;
}

function listDir(rel: string): PreviewNode {
	const dir = resolveInside(rel);
	const entries = fs
		.readdirSync(dir)
		.filter((name) => !name.startsWith('.'))
		.map((name) => {
			const child = rel ? `${rel}/${name}` : name;
			const stat = fs.statSync(resolveInside(child));
			if (stat.isDirectory()) {
				return { name, path: child, type: 'dir' as const };
			}
			if (!name.endsWith('.md')) return null;
			return { name: displayName(name), path: urlPath(child), type: 'file' as const };
		})
		.filter((entry): entry is { name: string; path: string; type: 'file' | 'dir' } => entry !== null)
		.sort((a, b) => {
			if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
			return a.name.localeCompare(b.name);
		});
	const title = rel ? displayName(rel.split('/').pop() ?? rel) : 'Sample notes';
	return { kind: 'dir', path: rel, title, entries };
}

export function loadPreview(urlPathName: string): PreviewNode | null {
	const rel = urlPathName.replace(/^\/+|\/+$/g, '');
	if (rel.includes('..')) return null;
	const asDir = resolveInside(rel);
	if (fs.existsSync(asDir) && fs.statSync(asDir).isDirectory()) {
		return listDir(rel);
	}
	const fileRel = `${rel}.md`;
	const filePath = resolveInside(fileRel);
	if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
	const content = fs.readFileSync(filePath, 'utf8');
	const html = renderMarkdown(content, {
		repoId: 'preview',
		filePath: fileRel,
		previewBase: '/preview'
	});
	const parent = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
	return {
		kind: 'file',
		path: rel,
		title: displayName(rel.split('/').pop() ?? rel),
		html,
		parent
	};
}
