export type RepoMeta = {
	id: string;
	name: string;
	remoteUrl: string;
	defaultBranch: string;
	contentRoot: string;
	createdAt: string;
	lastSyncedAt: string | null;
};

export type RepoPublic = RepoMeta;

export type AppSettings = {
	authorName: string;
	authorEmail: string;
	/** Repo opened automatically from home; null = show list when multiple */
	defaultRepoId: string | null;
	/** Favourited paths (repo-relative) keyed by repo id */
	favouritesByRepo: Record<string, string[]>;
	/** Present only in stored JSON — never returned to clients */
	token?: string;
	/** DeepSeek API key — present only in stored JSON — never returned to clients */
	aiKey?: string;
};

/** Settings shape safe to send to clients */
export type SettingsPublic = Omit<AppSettings, 'token' | 'aiKey'> & {
	hasToken: boolean;
	hasAiKey: boolean;
};

export type ResolveStrategy = 'keep_local' | 'keep_remote' | 'ai_merge';

export type ResolveOption = {
	id: string;
	title: string;
	summary: string;
	strategy: ResolveStrategy;
};

export type TreeEntry = {
	name: string;
	path: string;
	type: 'file' | 'dir';
};

export type SyncStatus = {
	clean: boolean;
	uncommitted: string[];
	ahead: number;
	behind: number;
	branch: string;
};

export type DiffFile = {
	path: string;
	status: 'modified' | 'added' | 'deleted';
	diff: string;
};
