import { readdir, readFile, writeFile, mkdir, rm, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'node:fs';
import type { DiffFile, RepoMeta, SyncStatus, TreeEntry } from '$lib/types';
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

const AUTH_FAILED = 'Authentication failed. Check the token under Settings.';
const MARKDOWN_FILE = /\.(md|markdown)$/i;

/** Thrown when local and remote both have commits the other lacks. */
export class DivergedError extends Error {
	readonly code = DIVERGED_CODE;
	constructor() {
		super('Histories have diverged. Choose an AI resolve option, or resolve on another machine.');
	}
}

function assertMarkdown(relativePath: string, action: string): void {
	if (!MARKDOWN_FILE.test(relativePath)) {
		throw new Error(`Only markdown files can be ${action}`);
	}
}

async function currentBranch(meta: RepoMeta, dir: string): Promise<string> {
	return (await git.currentBranch({ fs, dir, fullname: false })) || meta.defaultBranch;
}

function cleanStatus(branch: string): SyncStatus {
	return { clean: true, uncommitted: [], ahead: 0, behind: 0, branch };
}

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
			await rm(dir, { recursive: true, force: true });
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
		} else if (entry.isFile() && MARKDOWN_FILE.test(entry.name)) {
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
	assertMarkdown(relativePath, 'opened');
	const { absolute } = resolveMarkdownPath(repoDir(meta.id), meta.contentRoot, relativePath);
	try {
		return await readFile(absolute, 'utf8');
	} catch (err) {
		if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') throw new Error('File not found');
		throw err;
	}
}

export async function readMarkdownFileAtHead(
	meta: RepoMeta,
	relativePath: string
): Promise<string | null> {
	assertMarkdown(relativePath, 'opened');
	const dir = repoDir(meta.id);
	const { repoRelative } = resolveMarkdownPath(dir, meta.contentRoot, relativePath);
	return readBlobAtRef(dir, 'HEAD', repoRelative);
}

export async function writeMarkdownFile(
	meta: RepoMeta,
	relativePath: string,
	content: string
): Promise<void> {
	assertMarkdown(relativePath, 'saved');
	const { absolute } = resolveMarkdownPath(repoDir(meta.id), meta.contentRoot, relativePath);
	await mkdir(path.dirname(absolute), { recursive: true });
	await writeFile(absolute, content, 'utf8');
	invalidateSyncCache(meta.id);
}

/** Delete a markdown file from disk and stage the removal in git when tracked. */
export async function deleteMarkdownFile(meta: RepoMeta, relativePath: string): Promise<void> {
	assertMarkdown(relativePath, 'deleted');
	const dir = repoDir(meta.id);
	const { absolute, repoRelative } = resolveMarkdownPath(dir, meta.contentRoot, relativePath);

	try {
		await unlink(absolute);
	} catch (err) {
		const code = (err as NodeJS.ErrnoException)?.code;
		if (code !== 'ENOENT') throw err;
		throw new Error('File not found');
	}

	try {
		await git.remove({ fs, dir, filepath: repoRelative });
	} catch {
		// Untracked file — nothing to stage
	}
	invalidateSyncCache(meta.id);
}

/**
 * Delete a markdown file, commit the deletion if needed, and push.
 * Returns whether a commit was created.
 */
export async function deleteMarkdownFileAndSync(
	meta: RepoMeta,
	relativePath: string
): Promise<{ committed: boolean; sha?: string }> {
	const status = await getSyncStatus(meta);
	if (!status.clean) {
		throw new Error('Commit or discard other local changes before deleting a file');
	}

	await deleteMarkdownFile(meta, relativePath);

	const after = await getSyncStatus(meta);
	if (after.clean) {
		return { committed: false };
	}

	const name = relativePath.split('/').pop() || relativePath;
	const sha = await commitAll(meta, `docs/delete ${name}`);
	await pushRepo(meta);
	return { committed: true, sha };
}

function filterToContentRoot(meta: RepoMeta, repoRelativePath: string): boolean {
	if (!meta.contentRoot) return true;
	const root = meta.contentRoot.replace(/\\/g, '/');
	if (repoRelativePath === root || repoRelativePath.startsWith(root + '/')) return true;
	return (
		README_PATTERN.test(repoRelativePath.split('/').pop() ?? '') && !repoRelativePath.includes('/')
	);
}

/** Uncommitted [filepath, head, workdir] rows inside the content root. */
async function changedFiles(meta: RepoMeta, dir: string): Promise<Array<[string, number, number]>> {
	const matrix = await git.statusMatrix({ fs, dir });
	return matrix
		.filter(
			([filepath, head, workdir, stage]) =>
				filterToContentRoot(meta, filepath) && isMatrixChanged(head, workdir, stage)
		)
		.map(([filepath, head, workdir]) => [filepath, head, workdir]);
}

/** Commits on each side that the other side lacks. */
async function uniqueCommits(dir: string, localRef: string, remoteRef: string) {
	const localLog = await git.log({ fs, dir, ref: localRef });
	const remoteLog = await git.log({ fs, dir, ref: remoteRef });
	const localOids = new Set(localLog.map((c) => c.oid));
	const remoteOids = new Set(remoteLog.map((c) => c.oid));
	return {
		localOnly: localLog.filter((c) => !remoteOids.has(c.oid)),
		remoteOnly: remoteLog.filter((c) => !localOids.has(c.oid))
	};
}

/** Content-root files whose contents differ between the local branch and its remote. */
async function divergedFiles(meta: RepoMeta, dir: string, branch: string): Promise<ConflictFile[]> {
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
		// fall through with empty candidates
	}

	const files: ConflictFile[] = [];
	for (const filepath of candidatePaths) {
		if (!filterToContentRoot(meta, filepath)) continue;
		const local = await readBlobAtRef(dir, branch, filepath);
		const remoteContent = await readBlobAtRef(dir, remote, filepath);
		if (local === remoteContent) continue;
		files.push({ path: filepath, local, remote: remoteContent });
	}
	return files;
}

/** Reuse one remote check across folder and file navigations. */
const SYNC_TTL_MS = 30_000;

type AutoPullResult = { status: SyncStatus; pulled: boolean };

type SyncCacheEntry = { at: number; status: SyncStatus };
type InflightSync = { epoch: number; promise: Promise<AutoPullResult> };

const syncCache = new Map<string, SyncCacheEntry>();
const syncInflight = new Map<string, InflightSync>();
const syncEpoch = new Map<string, number>();

function invalidateSyncCache(repoId: string): void {
	syncCache.delete(repoId);
	syncEpoch.set(repoId, (syncEpoch.get(repoId) ?? 0) + 1);
}

function rememberSync(repoId: string, status: SyncStatus): void {
	syncCache.set(repoId, { at: Date.now(), status });
}

async function readRemoteOid(dir: string, branch: string): Promise<string | null> {
	try {
		return await git.resolveRef({ fs, dir, ref: `origin/${branch}` });
	} catch {
		return null;
	}
}

async function countAheadBehind(
	dir: string,
	branch: string,
	remoteOid: string | null
): Promise<{ ahead: number; behind: number }> {
	let ahead = 0;
	let behind = 0;
	try {
		const localOid = await git.resolveRef({ fs, dir, ref: branch });
		if (remoteOid && localOid !== remoteOid) {
			try {
				const { localOnly, remoteOnly } = await uniqueCommits(dir, branch, `origin/${branch}`);
				ahead = localOnly.length;
				behind = remoteOnly.length;
			} catch (err) {
				// Incomplete fetch / missing objects — force a re-fetch next pull rather than crashing Sync
				const msg = err instanceof Error ? err.message : String(err);
				if (/could not find|not found/i.test(msg)) {
					return { ahead: 0, behind: 1 };
				}
				throw err;
			}
		}
	} catch {
		// no remote tracking — leave ahead/behind at 0
	}
	return { ahead, behind };
}

/**
 * Move the local branch to origin/<branch> after a fetch.
 * isomorphic-git's fastForward() always fetches again; this does not.
 */
async function fastForwardLocal(dir: string, branch: string): Promise<void> {
	await git.merge({
		fs,
		dir,
		ours: branch,
		theirs: `origin/${branch}`,
		fastForward: true,
		fastForwardOnly: true
	});
	await git.checkout({
		fs,
		dir,
		ref: branch
	});
}

function asDiverged(err: unknown): Error {
	const msg = err instanceof Error ? err.message : String(err);
	if (/diverged|conflict|merge|fast.?forward|not.*ancestor/i.test(msg)) {
		return new DivergedError();
	}
	if (authError(err)) {
		return new Error(AUTH_FAILED);
	}
	return err instanceof Error ? err : new Error(msg);
}

/** One fetch. Skip a second worktree scan when the remote tip did not move. */
async function statusAfterFetch(meta: RepoMeta, pre: SyncStatus): Promise<SyncStatus> {
	const dir = repoDir(meta.id);
	const remoteBefore = await readRemoteOid(dir, pre.branch);
	await fetchRemote(meta);
	const remoteAfter = await readRemoteOid(dir, pre.branch);
	if (remoteBefore && remoteAfter === remoteBefore) return pre;
	const { ahead, behind } = await countAheadBehind(dir, pre.branch, remoteAfter);
	return { ...pre, ahead, behind };
}

export async function getSyncStatus(meta: RepoMeta): Promise<SyncStatus> {
	const dir = repoDir(meta.id);
	const branch = await currentBranch(meta, dir);
	const uncommitted = (await changedFiles(meta, dir)).map(([filepath]) => filepath);

	const remoteOid = await readRemoteOid(dir, branch);
	const { ahead, behind } = await countAheadBehind(dir, branch, remoteOid);

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
	const only = onlyPath
		? {
				repoRelative: resolveMarkdownPath(dir, meta.contentRoot, onlyPath).repoRelative,
				normalized: onlyPath.replace(/\\/g, '/')
			}
		: null;
	const diffs: DiffFile[] = [];

	for (const [filepath, head, workdir] of await changedFiles(meta, dir)) {
		if (
			only &&
			filepath !== only.repoRelative &&
			filepath !== only.normalized &&
			!filepath.endsWith(`/${only.normalized}`)
		) {
			continue;
		}

		let status: DiffFile['status'] = 'modified';
		if (head === 0) status = 'added';
		if (workdir === 0) status = 'deleted';

		const before = head !== 0 ? ((await readBlobAtRef(dir, 'HEAD', filepath)) ?? '') : '';
		let after = '';
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
	const changed = await changedFiles(meta, dir);
	if (changed.length === 0) throw new Error('Nothing to commit');

	for (const [filepath, , workdir] of changed) {
		if (workdir === 0) {
			await git.remove({ fs, dir, filepath });
		} else {
			await git.add({ fs, dir, filepath });
		}
	}

	const sha = await git.commit({
		fs,
		dir,
		message: message.trim(),
		author: {
			name: settings.authorName,
			email: settings.authorEmail
		}
	});
	invalidateSyncCache(meta.id);
	return sha;
}

export async function fetchRemote(meta: RepoMeta): Promise<void> {
	const dir = repoDir(meta.id);
	const token = await getGitToken();
	const branch = await currentBranch(meta, dir);
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
			throw new Error(AUTH_FAILED);
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
	invalidateSyncCache(meta.id);
	const dir = repoDir(meta.id);
	const status = await getSyncStatus(meta);
	const branch = status.branch;

	const { localOnly, remoteOnly } = await uniqueCommits(dir, branch, `origin/${branch}`);
	const summarize = (commits: typeof localOnly) =>
		commits.slice(0, 12).map((c) => ({
			oid: c.oid.slice(0, 7),
			message: (c.commit.message || '').split('\n')[0].slice(0, 120)
		}));

	const MAX_FILES = 8;
	const MAX_CHARS = 4000;
	const fileDiffs = (await divergedFiles(meta, dir, branch)).slice(0, MAX_FILES).map((f) => ({
		path: f.path,
		local: f.local?.slice(0, MAX_CHARS) ?? null,
		remote: f.remote?.slice(0, MAX_CHARS) ?? null,
		diff: unifiedDiff(f.path, f.remote ?? '', f.local ?? '').slice(0, MAX_CHARS)
	}));

	return {
		branch,
		ahead: status.ahead,
		behind: status.behind,
		localCommits: summarize(localOnly),
		remoteCommits: summarize(remoteOnly),
		fileDiffs
	};
}

export async function pullRepo(meta: RepoMeta): Promise<void> {
	const pre = await getSyncStatus(meta);
	if (!pre.clean) {
		throw new Error('Commit or discard local changes before pulling');
	}

	invalidateSyncCache(meta.id);
	const status = await statusAfterFetch(meta, pre);
	const branch = status.branch;
	const dir = repoDir(meta.id);

	if (status.ahead === 0 && status.behind === 0) {
		rememberSync(meta.id, status);
		return;
	}

	if (status.ahead > 0 && status.behind > 0) {
		throw new DivergedError();
	}

	if (status.ahead > 0 && status.behind === 0) {
		throw new Error('Local branch is ahead. Push instead of pulling.');
	}

	try {
		await fastForwardLocal(dir, branch);
	} catch (err) {
		throw asDiverged(err);
	}
	rememberSync(meta.id, cleanStatus(branch));
}

/**
 * Fetch remote and fast-forward when safe (clean + behind only).
 * Never throws for expected sync states — returns the latest status instead.
 * A recent check is reused so browsing folders does not fetch every click.
 * Manual pull still calls `pullRepo`, which always fetches.
 */
export async function autoPullIfBehind(meta: RepoMeta): Promise<AutoPullResult> {
	const cached = syncCache.get(meta.id);
	if (cached && Date.now() - cached.at < SYNC_TTL_MS) {
		return { status: cached.status, pulled: false };
	}

	const epoch = syncEpoch.get(meta.id) ?? 0;
	const pending = syncInflight.get(meta.id);
	if (pending && pending.epoch === epoch) {
		return pending.promise;
	}

	const promise = runAutoPull(meta).then((result) => {
		if (result.cacheable && (syncEpoch.get(meta.id) ?? 0) === epoch) {
			rememberSync(meta.id, result.status);
		}
		return { status: result.status, pulled: result.pulled };
	});
	const entry = { epoch, promise };
	syncInflight.set(meta.id, entry);
	try {
		return await promise;
	} finally {
		if (syncInflight.get(meta.id) === entry) syncInflight.delete(meta.id);
	}
}

async function runAutoPull(meta: RepoMeta): Promise<AutoPullResult & { cacheable: boolean }> {
	const pre = await getSyncStatus(meta);
	if (!pre.clean) {
		return { status: pre, pulled: false, cacheable: true };
	}

	let status: SyncStatus;
	try {
		status = await statusAfterFetch(meta, pre);
	} catch {
		return { status: pre, pulled: false, cacheable: false };
	}

	if (!(status.behind > 0 && status.ahead === 0)) {
		return { status, pulled: false, cacheable: true };
	}

	try {
		await fastForwardLocal(repoDir(meta.id), status.branch);
		return {
			status: cleanStatus(status.branch),
			pulled: true,
			cacheable: true
		};
	} catch {
		return { status, pulled: false, cacheable: true };
	}
}

export async function pushRepo(meta: RepoMeta, opts?: { force?: boolean }): Promise<void> {
	const token = await getGitToken();
	if (!token) {
		throw new Error('A personal access token is required to push. Add one under Settings.');
	}
	const dir = repoDir(meta.id);
	const branch = await currentBranch(meta, dir);

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
		invalidateSyncCache(meta.id);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (/non-fast-forward|rejected|fetch first/i.test(msg)) {
			throw new Error('Push rejected (non-fast-forward). Pull first, then try again.');
		}
		if (authError(err)) {
			throw new Error(AUTH_FAILED);
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
	invalidateSyncCache(meta.id);
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
	rememberSync(meta.id, cleanStatus(branch));
}

export type ConflictFile = { path: string; local: string | null; remote: string | null };

/**
 * Collect files that differ between local and remote for AI merge.
 * Prefer this over starting a conflicted merge state with isomorphic-git.
 */
export async function listMergeConflicts(meta: RepoMeta): Promise<ConflictFile[]> {
	await fetchRemote(meta);
	invalidateSyncCache(meta.id);
	const status = await getSyncStatus(meta);
	return divergedFiles(meta, repoDir(meta.id), status.branch);
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
	invalidateSyncCache(meta.id);
}
