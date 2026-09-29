import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoOrThrow, updateRepo } from '$lib/server/repos';
import {
	applyAiMergeAndCommit,
	getSyncStatus,
	listMergeConflicts,
	pushRepo,
	resetToRemote
} from '$lib/server/git';
import { AiError, chatCompletion } from '$lib/server/ai';
import type { ResolveStrategy } from '$lib/types';

const STRATEGIES: ResolveStrategy[] = ['keep_local', 'keep_remote', 'ai_merge'];

async function resolveFileWithAi(
	path: string,
	local: string | null,
	remote: string | null
): Promise<string | null> {
	if (local === null && remote === null) return null;
	if (local === null) return remote;
	if (remote === null) return local;
	if (local === remote) return local;

	const raw = await chatCompletion({
		messages: [
			{
				role: 'system',
				content: `You merge two versions of a markdown (or text) file after a git divergence.
Return ONLY the full merged file content. No markdown fences, no commentary.
Preserve YAML frontmatter if present. Prefer keeping unique bullets/sections from both sides.
Do not invent facts that are not in either version.`
			},
			{
				role: 'user',
				content: `File: ${path}\n\n===== LOCAL =====\n${local}\n\n===== REMOTE =====\n${remote}\n`
			}
		],
		temperature: 0.1,
		maxTokens: 8000
	});

	return raw.replace(/^```(?:markdown|md)?\n?/i, '').replace(/\n?```$/i, '').trimEnd() + '\n';
}

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const repo = await getRepoOrThrow(params.id);
		const body = await request.json();
		const strategy = body.strategy as ResolveStrategy;
		if (!STRATEGIES.includes(strategy)) {
			error(400, 'Invalid strategy');
		}

		const status = await getSyncStatus(repo);
		if (!status.clean) {
			error(400, 'Commit or discard local changes before resolving');
		}

		if (strategy === 'keep_remote') {
			await resetToRemote(repo);
			await updateRepo(repo.id, { lastSyncedAt: new Date().toISOString() });
			return json({ ok: true, strategy });
		}

		if (strategy === 'keep_local') {
			await pushRepo(repo, { force: true });
			await updateRepo(repo.id, { lastSyncedAt: new Date().toISOString() });
			return json({ ok: true, strategy });
		}

		// ai_merge
		const conflicts = await listMergeConflicts(repo);
		if (conflicts.length === 0) {
			// Nothing to merge at file level — reset if somehow aligned, else force merge commit via remote-only
			error(400, 'No differing files found to merge. Try Pull again.');
		}

		const resolutions: Array<{ path: string; content: string | null }> = [];
		for (const c of conflicts) {
			try {
				const content = await resolveFileWithAi(c.path, c.local, c.remote);
				resolutions.push({ path: c.path, content });
			} catch (err) {
				if (err instanceof AiError) {
					return json({ message: err.message, needsAiKey: true }, { status: 400 });
				}
				throw err;
			}
		}

		await applyAiMergeAndCommit(
			repo,
			resolutions,
			'merge: AI-resolved diverged histories\n\nCombined local and remote markdown changes.'
		);
		await pushRepo(repo);
		await updateRepo(repo.id, { lastSyncedAt: new Date().toISOString() });
		return json({ ok: true, strategy, files: resolutions.map((r) => r.path) });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		const message = err instanceof Error ? err.message : 'Resolve failed';
		if (message === 'Repository not found') error(404, message);
		if (message.includes('DeepSeek') || message.includes('AI key')) {
			return json({ message, needsAiKey: true }, { status: 400 });
		}
		error(400, message);
	}
};
