import { readdir, readFile, writeFile, mkdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'node:fs';
import type { DiffFile, SyncStatus, TreeEntry } from '$lib/types';
import type { RepoMeta } from '$lib/types';
import { getGitToken, getSettings } from './settings';
import {
	repoDir,
	resolveContentPath,
	resolveMarkdownPath,
	toRootScopedPath,
	isRootScopedPath,
	ensureDataDirs
} from './paths';
import { pathExists } from './repos';
import { isMatrixChanged, unifiedDiff } from '$lib/diff';

export const DIVERGED_CODE = 'HISTORIES_DIVERGED';

/** GitHub: x-access-token + PAT; also works for many GitLab/Gitea HTTPS setups */
function onAuth(token?: string) {
	if (!token) return undefined;
	return () => ({
		username: 'x-access-token',
		password: token
	});
}

function authError(err: unknown): boolean {
	const msg = err instanceof Error ? err.message : String(err);
	return /401|403|auth|authentication|unauthorized/i.test(msg);
}

async function readBlobAtRef(dir: string, ref: string, filepath: string): Promise<string | null> {
	try {
		const oid = await git.resolveRef({ fs, dir, ref });
		const { blob } = await git.readBlob({ fs, dir, oid, filepath });
		return Buffer.from(blob).toString('utf8');
	} catch {
		return null;
	}
}

export async function cloneRepo(meta: RepoMeta): Promise<void> {
	await ensureDataDirs();
	const dir = repoDir(meta.id);
	await mkdir(dir, { recursive: true });
	const token = await getGitToken();

	const ref = meta.defaultBranch || undefined;
	try {
		await git.clone({
			fs,
			http,
			dir,
			url: meta.remoteUrl,
			singleBranch: true,
			...(ref ? { ref } : {}),
			onAuth: onAuth(token)
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
				onAuth: onAuth(token)
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

const README_PATTERN = /^readme\.(md|markdown)$/i;

async function listRootReadmes(repoRoot: string): Promise<TreeEntry[]> {
	const entries = await readdir(repoRoot, { withFileTypes: true });
	const result: TreeEntry[] = [];
	for (const entry of entries) {
		if (entry.isFile() && README_PATTERN.test(entry.name)) {
			result.push({
				name: entry.name,
				path: toRootScopedPath(entry.name),
				type: 'file'
			});
		}
	}
	return result;
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

	if (meta.contentRoot && !relativePath) {
		result.push(...(await listRootReadmes(dir)));
	}

	return result.sort((a, b) => {
		const aRoot = isRootScopedPath(a.path);
		const bRoot = isRootScopedPath(b.path);
		if (aRoot !== bRoot) return aRoot ? -1 : 1;
		if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
}

export async function readMarkdownFile(meta: RepoMeta, relativePath: string): Promise<string> {
	if (!/\.(md|markdown)$/i.test(relativePath)) {
		throw new Error('Only markdown files can be opened');
	}
	const { absolute } = resolveMarkdownPath(repoDir(meta.id), meta.contentRoot, relativePath);
	return readFile(absolute, 'utf8');
}

export async function readMarkdownFileAtHead(
	meta: RepoMeta,
	relativePath: string
): Promise<string | null> {
	if (!/\.(md|markdown)$/i.test(relativePath)) {
		throw new Error('Only markdown files can be opened');
	}
	const dir = repoDir(meta.id);
	const { repoRelative } = resolveMarkdownPath(dir, meta.contentRoot, relativePath);

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
	const { absolute } = resolveMarkdownPath(repoDir(meta.id), meta.contentRoot, relativePath);
	await mkdir(path.dirname(absolute), { recursive: true });
	await writeFile(absolute, content, 'utf8');
}

async function matrixStatus(dir: string) {
	return git.statusMatrix({ fs, dir });
}

function filterToContentRoot(meta: RepoMeta, repoRelativePath: string): boolean {
	if (!meta.contentRoot) return true;
	const root = meta.contentRoot.replace(/\\/g, '/');
	if (repoRelativePath === root || repoRelativePath.startsWith(root + '/')) return true;
	return (
		README_PATTERN.test(repoRelativePath.split('/').pop() ?? '') && !repoRelativePath.includes('/')
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
			try {
				const localLog = await git.log({ fs, dir, ref: branch });
				const remoteLog = await git.log({ fs, dir, ref: remote });
				const localOids = new Set(localLog.map((c) => c.oid));
				const remoteOids = new Set(remoteLog.map((c) => c.oid));
				ahead = localLog.filter((c) => !remoteOids.has(c.oid)).length;
				behind = remoteLog.filter((c) => !localOids.has(c.oid)).length;
			} catch (err) {
				// Incomplete fetch / missing objects — force a re-fetch next pull rather than crashing Sync
				const msg = err instanceof Error ? err.message : String(err);
				if (/could not find|not found/i.test(msg)) {
					ahead = 0;
					behind = 1;
				} else {
					throw err;
				}
			}
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
			const { repoRelative: repoOnly } = resolveMarkdownPath(dir, meta.contentRoot, onlyPath);
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

export async function fetchRemote(meta: RepoMeta): Promise<void> {
	const dir = repoDir(meta.id);
	const token = await getGitToken();
	const branch =
		(await git.currentBranch({ fs, dir, fullname: false })) || meta.defaultBranch;
	try {
		await git.fetch({
			fs,
			http,
			dir,
			remote: 'origin',
			ref: branch,
			singleBranch: true,
			tags: false,
			depth: undefined,
			onAuth: onAuth(token)
		});
	} catch (err) {
		if (authError(err)) {
			throw new Error('Authentication failed. Check the token under Settings.');
		}
		throw err;
	}
}

export type DivergeContext = {
	branch: string;
	ahead: number;
	behind: number;
	localCommits: Array<{ oid: string; message: string }>;
	remoteCommits: Array<{ oid: string; message: string }>;
	fileDiffs: Array<{ path: string; local: string | null; remote: string | null; diff: string }>;
};

export async function getDivergeContext(meta: RepoMeta): Promise<DivergeContext> {
	await fetchRemote(meta);
	const dir = repoDir(meta.id);
	const status = await getSyncStatus(meta);
	const branch = status.branch;
	const remote = `origin/${branch}`;

	const localLog = await git.log({ fs, dir, ref: branch });
	const remoteLog = await git.log({ fs, dir, ref: remote });
	const localOids = new Set(localLog.map((c) => c.oid));
	const remoteOids = new Set(remoteLog.map((c) => c.oid));

	const localOnly = localLog.filter((c) => !remoteOids.has(c.oid));
	const remoteOnly = remoteLog.filter((c) => !localOids.has(c.oid));

	const localCommits = localOnly.slice(0, 12).map((c) => ({
		oid: c.oid.slice(0, 7),
		message: (c.commit.message || '').split('\n')[0].slice(0, 120)
	}));
	const remoteCommits = remoteOnly.slice(0, 12).map((c) => ({
		oid: c.oid.slice(0, 7),
		message: (c.commit.message || '').split('\n')[0].slice(0, 120)
	}));

	const candidatePaths = new Set<string>();
	try {
		await git.walk({
			fs,
			dir,
			trees: [git.TREE({ ref: branch }), git.TREE({ ref: remote })],
			map: async (filepath, [a, b]) => {
				if (!filepath || filepath === '.') return;
				const aType = a ? await a.type() : null;
				const bType = b ? await b.type() : null;
				if (aType === 'tree' || bType === 'tree') return;
				const aOid = a ? await a.oid() : null;
				const bOid = b ? await b.oid() : null;
				if (aOid !== bOid) candidatePaths.add(filepath);
			}
		});
	} catch {
		// fall through with empty candidates
	}

	const fileDiffs: DivergeContext['fileDiffs'] = [];
	const MAX_FILES = 8;
	const MAX_CHARS = 4000;
	for (const filepath of [...candidatePaths].slice(0, MAX_FILES)) {
		if (!filterToContentRoot(meta, filepath)) continue;
		const local = await readBlobAtRef(dir, branch, filepath);
		const remoteContent = await readBlobAtRef(dir, remote, filepath);
		if (local === remoteContent) continue;
		const diff = unifiedDiff(filepath, remoteContent ?? '', local ?? '').slice(0, MAX_CHARS);
		fileDiffs.push({
			path: filepath,
			local: local?.slice(0, MAX_CHARS) ?? null,
			remote: remoteContent?.slice(0, MAX_CHARS) ?? null,
			diff
		});
	}

	return {
		branch,
		ahead: status.ahead,
		behind: status.behind,
		localCommits,
		remoteCommits,
		fileDiffs
	};
}

export async function pullRepo(meta: RepoMeta): Promise<void> {
	const pre = await getSyncStatus(meta);
	if (!pre.clean) {
		throw new Error('Commit or discard local changes before pulling');
	}

	await fetchRemote(meta);
	const status = await getSyncStatus(meta);
	const branch = status.branch;
	const settings = await getSettings();
	const token = settings.token?.trim() || undefined;
	const dir = repoDir(meta.id);

	if (status.ahead === 0 && status.behind === 0) {
		return;
	}

	if (status.ahead > 0 && status.behind > 0) {
		const err = new Error(
			'Histories have diverged. Choose an AI resolve option, or resolve on another machine.'
		);
		(err as Error & { code?: string }).code = DIVERGED_CODE;
		throw err;
	}

	if (status.ahead > 0 && status.behind === 0) {
		throw new Error('Local branch is ahead. Push instead of pulling.');
	}

	try {
		await git.fastForward({
			fs,
			http,
			dir,
			ref: branch,
			singleBranch: true,
			onAuth: onAuth(token)
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (/diverged|conflict|merge|fast.?forward|not.*ancestor/i.test(msg)) {
			const diverge = new Error(
				'Histories have diverged. Choose an AI resolve option, or resolve on another machine.'
			);
			(diverge as Error & { code?: string }).code = DIVERGED_CODE;
			throw diverge;
		}
		if (authError(err)) {
			throw new Error('Authentication failed. Check the token under Settings.');
		}
		throw err;
	}
}

export async function pushRepo(meta: RepoMeta, opts?: { force?: boolean }): Promise<void> {
	const token = await getGitToken();
	if (!token) {
		throw new Error('A personal access token is required to push. Add one under Settings.');
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
			force: opts?.force === true,
			onAuth: onAuth(token)
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (/non-fast-forward|rejected|fetch first/i.test(msg)) {
			throw new Error('Push rejected (non-fast-forward). Pull first, then try again.');
		}
		if (authError(err)) {
			throw new Error('Authentication failed. Check the token under Settings.');
		}
		throw err;
	}
}

/** Discard local-only commits and match origin/<branch>. */
export async function resetToRemote(meta: RepoMeta): Promise<void> {
	const status = await getSyncStatus(meta);
	if (!status.clean) {
		throw new Error('Commit or discard local changes before resetting');
	}
	await fetchRemote(meta);
	const dir = repoDir(meta.id);
	const branch = status.branch;
	const remote = `origin/${branch}`;
	const oid = await git.resolveRef({ fs, dir, ref: remote });
	await git.writeRef({
		fs,
		dir,
		ref: `refs/heads/${branch}`,
		value: oid,
		force: true
	});
	await git.checkout({ fs, dir, ref: branch, force: true });
}

export type ConflictFile = { path: string; local: string | null; remote: string | null };

/**
 * Collect files that differ between local and remote for AI merge.
 * Prefer this over starting a conflicted merge state with isomorphic-git.
 */
export async function listMergeConflicts(meta: RepoMeta): Promise<ConflictFile[]> {
	await fetchRemote(meta);
	const dir = repoDir(meta.id);
	const status = await getSyncStatus(meta);
	const branch = status.branch;
	const remote = `origin/${branch}`;

	const candidatePaths = new Set<string>();
	try {
		await git.walk({
			fs,
			dir,
			trees: [git.TREE({ ref: branch }), git.TREE({ ref: remote })],
			map: async (filepath, [a, b]) => {
				if (!filepath || filepath === '.') return;
				const aType = a ? await a.type() : null;
				const bType = b ? await b.type() : null;
				if (aType === 'tree' || bType === 'tree') return;
				const aOid = a ? await a.oid() : null;
				const bOid = b ? await b.oid() : null;
				if (aOid !== bOid) candidatePaths.add(filepath);
			}
		});
	} catch {
		// empty
	}

	const conflicts: ConflictFile[] = [];
	for (const filepath of candidatePaths) {
		if (!filterToContentRoot(meta, filepath)) continue;
		const local = await readBlobAtRef(dir, branch, filepath);
		const remoteContent = await readBlobAtRef(dir, remote, filepath);
		if (local === remoteContent) continue;
		conflicts.push({ path: filepath, local, remote: remoteContent });
	}
	return conflicts;
}

/**
 * Apply AI-resolved file contents, then create a merge commit that joins
 * origin/<branch> into the local branch (octopus-style via two parents when possible).
 */
export async function applyAiMergeAndCommit(
	meta: RepoMeta,
	resolutions: Array<{ path: string; content: string | null }>,
	message: string
): Promise<void> {
	const status = await getSyncStatus(meta);
	if (!status.clean) {
		throw new Error('Working tree must be clean before applying merge resolutions');
	}
	await fetchRemote(meta);
	const dir = repoDir(meta.id);
	const branch = status.branch;
	const remote = `origin/${branch}`;
	const settings = await getSettings();
	const author = { name: settings.authorName, email: settings.authorEmail };

	const localOid = await git.resolveRef({ fs, dir, ref: branch });
	const remoteOid = await git.resolveRef({ fs, dir, ref: remote });

	for (const { path: filepath, content } of resolutions) {
		const abs = path.join(dir, filepath);
		if (content === null) {
			try {
				await unlink(abs);
			} catch {
				// ignore
			}
			try {
				await git.remove({ fs, dir, filepath });
			} catch {
				// ignore
			}
		} else {
			await mkdir(path.dirname(abs), { recursive: true });
			await writeFile(abs, content, 'utf8');
			await git.add({ fs, dir, filepath });
		}
	}

	await git.commit({
		fs,
		dir,
		message: message.trim(),
		author,
		parent: [localOid, remoteOid]
	});
}

async function rmSafe(dir: string): Promise<void> {
	const { rm } = await import('node:fs/promises');
	await rm(dir, { recursive: true, force: true });
}
