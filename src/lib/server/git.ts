import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'node:fs';
import type { DiffFile, SyncStatus, TreeEntry } from '$lib/types';
import type { RepoMeta } from '$lib/types';
import { getSettings } from './settings';
import {
	repoDir,
	resolveContentPath,
	toRepoRelative,
	ensureDataDirs
} from './paths';
import { pathExists } from './repos';
import { isMatrixChanged, unifiedDiff } from '$lib/diff';

/** GitHub: x-access-token + PAT; also works for many GitLab/Gitea HTTPS setups */
function onAuth(token?: string) {
	if (!token) return undefined;
	return () => ({
		username: 'x-access-token',
		password: token
	});
}

export async function cloneRepo(meta: RepoMeta): Promise<void> {
	await ensureDataDirs();
	const dir = repoDir(meta.id);
	await mkdir(dir, { recursive: true });

	const ref = meta.defaultBranch || undefined;
	try {
		await git.clone({
			fs,
			http,
			dir,
			url: meta.remoteUrl,
			singleBranch: true,
			...(ref ? { ref } : {}),
			onAuth: onAuth(meta.token)
		});
	} catch (err) {
		// Retry without explicit ref if branch name wrong
		if (ref) {
			await rmSafe(dir);
			await mkdir(dir, { recursive: true });
			await git.clone({
				fs,
				http,
				dir,
				url: meta.remoteUrl,
				singleBranch: true,
				onAuth: onAuth(meta.token)
			});
		} else {
			throw err;
		}
	}

	// Discover actual branch if needed
	const branch = await git.currentBranch({ fs, dir, fullname: false });
	if (branch && branch !== meta.defaultBranch) {
		meta.defaultBranch = branch;
	}

	if (meta.contentRoot) {
		const root = resolveContentPath(dir, meta.contentRoot, '');
		if (!(await pathExists(root))) {
			throw new Error(`Content root not found: ${meta.contentRoot}`);
		}
		const st = await stat(root);
		if (!st.isDirectory()) {
			throw new Error(`Content root is not a directory: ${meta.contentRoot}`);
		}
	}
}

export async function listTree(meta: RepoMeta, relativePath = ''): Promise<TreeEntry[]> {
	const dir = repoDir(meta.id);
	const abs = resolveContentPath(dir, meta.contentRoot, relativePath);
	const entries = await readdir(abs, { withFileTypes: true });
	const result: TreeEntry[] = [];

	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue;
		const childRel = relativePath ? `${relativePath}/${entry.name}` : entry.name;
		if (entry.isDirectory()) {
			result.push({ name: entry.name, path: childRel, type: 'dir' });
		} else if (entry.isFile() && /\.(md|markdown)$/i.test(entry.name)) {
			result.push({ name: entry.name, path: childRel, type: 'file' });
		}
	}

	return result.sort((a, b) => {
		if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
}

export async function readMarkdownFile(meta: RepoMeta, relativePath: string): Promise<string> {
	if (!/\.(md|markdown)$/i.test(relativePath)) {
		throw new Error('Only markdown files can be opened');
	}
	const abs = resolveContentPath(repoDir(meta.id), meta.contentRoot, relativePath);
	return readFile(abs, 'utf8');
}

export async function readMarkdownFileAtHead(
	meta: RepoMeta,
	relativePath: string
): Promise<string | null> {
	if (!/\.(md|markdown)$/i.test(relativePath)) {
		throw new Error('Only markdown files can be opened');
	}
	const dir = repoDir(meta.id);
	const abs = resolveContentPath(dir, meta.contentRoot, relativePath);
	const repoRelative = toRepoRelative(dir, abs);

	try {
		const commit = await git.resolveRef({ fs, dir, ref: 'HEAD' });
		const { blob } = await git.readBlob({ fs, dir, oid: commit, filepath: repoRelative });
		return Buffer.from(blob).toString('utf8');
	} catch {
		return null;
	}
}

export async function writeMarkdownFile(
	meta: RepoMeta,
	relativePath: string,
	content: string
): Promise<void> {
	if (!/\.(md|markdown)$/i.test(relativePath)) {
		throw new Error('Only markdown files can be saved');
	}
	const abs = resolveContentPath(repoDir(meta.id), meta.contentRoot, relativePath);
	await mkdir(path.dirname(abs), { recursive: true });
	await writeFile(abs, content, 'utf8');
}

async function matrixStatus(dir: string) {
	return git.statusMatrix({ fs, dir });
}

function filterToContentRoot(
	meta: RepoMeta,
	repoRelativePath: string
): boolean {
	if (!meta.contentRoot) return true;
	const root = meta.contentRoot.replace(/\\/g, '/');
	return (
		repoRelativePath === root ||
		repoRelativePath.startsWith(root + '/')
	);
}

export async function getSyncStatus(meta: RepoMeta): Promise<SyncStatus> {
	const dir = repoDir(meta.id);
	const branch = (await git.currentBranch({ fs, dir, fullname: false })) || meta.defaultBranch;
	const matrix = await matrixStatus(dir);
	const uncommitted: string[] = [];

	for (const [filepath, head, workdir, stage] of matrix) {
		if (!filterToContentRoot(meta, filepath)) continue;
		if (!isMatrixChanged(head, workdir, stage)) continue;
		uncommitted.push(filepath);
	}

	let ahead = 0;
	let behind = 0;
	try {
		const remote = `origin/${branch}`;
		const localOid = await git.resolveRef({ fs, dir, ref: branch });
		let remoteOid: string | null = null;
		try {
			remoteOid = await git.resolveRef({ fs, dir, ref: remote });
		} catch {
			remoteOid = null;
		}
		if (remoteOid && localOid !== remoteOid) {
			const localLog = await git.log({ fs, dir, ref: branch });
			const remoteLog = await git.log({ fs, dir, ref: remote });
			const localOids = new Set(localLog.map((c) => c.oid));
			const remoteOids = new Set(remoteLog.map((c) => c.oid));
			ahead = localLog.filter((c) => !remoteOids.has(c.oid)).length;
			behind = remoteLog.filter((c) => !localOids.has(c.oid)).length;
		}
	} catch {
		// no remote tracking — leave ahead/behind at 0
	}

	return {
		clean: uncommitted.length === 0,
		uncommitted,
		ahead,
		behind,
		branch
	};
}

export async function getDiffs(meta: RepoMeta, onlyPath?: string): Promise<DiffFile[]> {
	const dir = repoDir(meta.id);
	const matrix = await matrixStatus(dir);
	const diffs: DiffFile[] = [];

	for (const [filepath, head, workdir, stage] of matrix) {
		if (!filterToContentRoot(meta, filepath)) continue;
		if (!isMatrixChanged(head, workdir, stage)) continue;

		if (onlyPath) {
			const absOnly = resolveContentPath(dir, meta.contentRoot, onlyPath);
			const repoOnly = toRepoRelative(dir, absOnly);
			const normalized = onlyPath.replace(/\\/g, '/');
			if (filepath !== repoOnly && filepath !== normalized && !filepath.endsWith(`/${normalized}`)) {
				continue;
			}
		}

		let status: DiffFile['status'] = 'modified';
		if (head === 0) status = 'added';
		if (workdir === 0) status = 'deleted';

		let before = '';
		let after = '';
		try {
			if (head !== 0) {
				const commit = await git.resolveRef({ fs, dir, ref: 'HEAD' });
				const { blob } = await git.readBlob({ fs, dir, oid: commit, filepath });
				before = Buffer.from(blob).toString('utf8');
			}
		} catch {
			before = '';
		}
		try {
			if (workdir !== 0) {
				after = await readFile(path.join(dir, filepath), 'utf8');
			}
		} catch {
			after = '';
		}

		diffs.push({
			path: filepath,
			status,
			diff: unifiedDiff(filepath, before, after)
		});
	}

	return diffs;
}

export async function commitAll(meta: RepoMeta, message: string): Promise<string> {
	const dir = repoDir(meta.id);
	const settings = await getSettings();
	const matrix = await matrixStatus(dir);
	let staged = 0;

	for (const [filepath, head, workdir, stage] of matrix) {
		if (!filterToContentRoot(meta, filepath)) continue;
		if (!isMatrixChanged(head, workdir, stage)) continue;

		if (workdir === 0) {
			await git.remove({ fs, dir, filepath });
		} else {
			await git.add({ fs, dir, filepath });
		}
		staged++;
	}

	if (staged === 0) throw new Error('Nothing to commit');

	const sha = await git.commit({
		fs,
		dir,
		message: message.trim(),
		author: {
			name: settings.authorName,
			email: settings.authorEmail
		}
	});
	return sha;
}

export async function pullRepo(meta: RepoMeta): Promise<void> {
	const dir = repoDir(meta.id);
	const status = await getSyncStatus(meta);
	if (!status.clean) {
		throw new Error('Commit or discard local changes before pulling');
	}

	const branch = status.branch;
	const settings = await getSettings();

	try {
		await git.pull({
			fs,
			http,
			dir,
			ref: branch,
			singleBranch: true,
			fastForward: true,
			onAuth: onAuth(meta.token),
			author: {
				name: settings.authorName,
				email: settings.authorEmail
			}
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (/diverged|conflict|merge|fast.?forward/i.test(msg)) {
			throw new Error(
				'Histories have diverged; resolve on another machine or reset. In-app merge is not supported in v1.'
			);
		}
		throw err;
	}
}

export async function pushRepo(meta: RepoMeta): Promise<void> {
	if (!meta.token) {
		throw new Error('A personal access token is required to push');
	}
	const dir = repoDir(meta.id);
	const branch =
		(await git.currentBranch({ fs, dir, fullname: false })) || meta.defaultBranch;

	try {
		await git.push({
			fs,
			http,
			dir,
			remote: 'origin',
			ref: branch,
			onAuth: onAuth(meta.token)
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (/non-fast-forward|rejected|fetch first/i.test(msg)) {
			throw new Error('Push rejected (non-fast-forward). Pull first, then try again.');
		}
		if (/401|403|auth|authentication|unauthorized/i.test(msg)) {
			throw new Error('Authentication failed. Check the repository token.');
		}
		throw err;
	}
}

async function rmSafe(dir: string): Promise<void> {
	const { rm } = await import('node:fs/promises');
	await rm(dir, { recursive: true, force: true });
}
