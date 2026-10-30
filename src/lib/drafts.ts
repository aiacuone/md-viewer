import { browser } from '$app/environment';

/** Unsaved editor content kept on this device until it is saved or discarded. */
export interface Draft {
	content: string;
	/** The saved file content the draft was edited from. */
	base: string;
	savedAt: number;
}

const PREFIX = 'md-viewer:draft:';

export function draftKey(repoId: string, path: string): string {
	return `${PREFIX}${repoId}:${path}`;
}

// Storage can be missing or throw (private mode, quota, blocked site data),
// so every access is guarded and a failure only means no draft is kept.
export function readDraft(key: string): Draft | null {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		const draft = JSON.parse(raw) as Draft;
		return typeof draft.content === 'string' && typeof draft.base === 'string' ? draft : null;
	} catch {
		return null;
	}
}

export function writeDraft(key: string, draft: Draft): void {
	if (!browser) return;
	try {
		localStorage.setItem(key, JSON.stringify(draft));
	} catch {
		// Quota or blocked storage: the edit stays in memory only.
	}
}

export function clearDraft(key: string): void {
	if (!browser) return;
	try {
		localStorage.removeItem(key);
	} catch {
		// Nothing to clear.
	}
}
