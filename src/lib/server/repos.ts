import { randomUUID } from 'node:crypto';
import { readFile, writeFile, rm, access } from 'node:fs/promises';
import type { RepoMeta, RepoPublic } from '$lib/types';
import { META_PATH, ensureDataDirs, repoDir } from './paths';

async function readAll(): Promise<RepoMeta[]> {
	await ensureDataDirs();
	try {
		const raw = await readFile(META_PATH, 'utf8');
		const data = JSON.parse(raw);
		return Array.isArray(data) ? data : [];
	} catch {
		return [];
	}
}

async function writeAll(repos: RepoMeta[]): Promise<void> {
	await ensureDataDirs();
	await writeFile(META_PATH, JSON.stringify(repos, null, 2), 'utf8');
}

export function toPublic(repo: RepoMeta): RepoPublic {
	const { token, ...rest } = repo;
	return { ...rest, hasToken: Boolean(token) };
}

export async function listRepos(): Promise<RepoPublic[]> {
	const repos = await readAll();
	return repos.map(toPublic);
}

export async function getRepo(id: string): Promise<RepoMeta | null> {
	const repos = await readAll();
	return repos.find((r) => r.id === id) ?? null;
}

export async function getRepoOrThrow(id: string): Promise<RepoMeta> {
	const repo = await getRepo(id);
	if (!repo) throw new Error('Repository not found');
	return repo;
}

function nameFromUrl(url: string): string {
	try {
		const cleaned = url.replace(/\.git$/, '').replace(/\/$/, '');
		const parts = cleaned.split('/');
		return parts[parts.length - 1] || 'repository';
	} catch {
		return 'repository';
	}
}

export type AddRepoInput = {
	remoteUrl: string;
	name?: string;
	contentRoot?: string;
	token?: string;
	defaultBranch?: string;
};

export async function addRepoMeta(input: AddRepoInput): Promise<RepoMeta> {
	const repos = await readAll();
	const id = randomUUID();
	const meta: RepoMeta = {
		id,
		name: (input.name?.trim() || nameFromUrl(input.remoteUrl)).trim(),
		remoteUrl: input.remoteUrl.trim(),
		defaultBranch: input.defaultBranch?.trim() || 'main',
		contentRoot: normalizeContentRoot(input.contentRoot),
		createdAt: new Date().toISOString(),
		lastSyncedAt: null,
		token: input.token?.trim() || undefined
	};
	repos.push(meta);
	await writeAll(repos);
	return meta;
}

export async function updateRepo(id: string, patch: Partial<RepoMeta>): Promise<RepoMeta> {
	const repos = await readAll();
	const idx = repos.findIndex((r) => r.id === id);
	if (idx === -1) throw new Error('Repository not found');
	repos[idx] = { ...repos[idx], ...patch, id };
	await writeAll(repos);
	return repos[idx];
}

export async function removeRepo(id: string): Promise<void> {
	const repos = await readAll();
	const next = repos.filter((r) => r.id !== id);
	if (next.length === repos.length) throw new Error('Repository not found');
	await writeAll(next);
	await rm(repoDir(id), { recursive: true, force: true });
}

export async function rollbackAdd(id: string): Promise<void> {
	const repos = await readAll();
	await writeAll(repos.filter((r) => r.id !== id));
	await rm(repoDir(id), { recursive: true, force: true });
}

export function normalizeContentRoot(value?: string): string {
	if (!value) return '';
	return value
		.trim()
		.replace(/^\/+|\/+$/g, '')
		.replace(/\\/g, '/');
}

export async function pathExists(p: string): Promise<boolean> {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
}
