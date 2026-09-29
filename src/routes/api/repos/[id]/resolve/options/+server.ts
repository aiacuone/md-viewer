import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoOrThrow } from '$lib/server/repos';
import { getDivergeContext, getSyncStatus } from '$lib/server/git';
import { AiError, chatJson } from '$lib/server/ai';
import type { ResolveOption, ResolveStrategy } from '$lib/types';

const STRATEGIES: ResolveStrategy[] = ['keep_local', 'keep_remote', 'ai_merge'];

function fallbackOptions(ahead: number, behind: number): ResolveOption[] {
	return [
		{
			id: 'keep_remote',
			title: 'Use remote',
			summary: `Discard ${ahead} local-only commit(s) and match GitHub (${behind} remote commit(s)).`,
			strategy: 'keep_remote'
		},
		{
			id: 'ai_merge',
			title: 'AI merge both',
			summary: 'Combine local and remote changes with AI, then commit and push.',
			strategy: 'ai_merge'
		},
		{
			id: 'keep_local',
			title: 'Keep this device (force push)',
			summary: `Overwrite remote with this device's history. Remote-only commits will be lost.`,
			strategy: 'keep_local'
		}
	];
}

export const POST: RequestHandler = async ({ params }) => {
	try {
		const repo = await getRepoOrThrow(params.id);
		const status = await getSyncStatus(repo);
		if (!status.clean) {
			error(400, 'Commit or discard local changes before resolving');
		}

		const ctx = await getDivergeContext(repo);
		if (!(ctx.ahead > 0 && ctx.behind > 0)) {
			error(400, 'Histories are not diverged. Try Pull or Push instead.');
		}

		let options: ResolveOption[];
		try {
			const result = await chatJson<{ options?: ResolveOption[] }>({
				messages: [
					{
						role: 'system',
						content: `You help resolve git history divergence for a markdown notes app.
Return JSON: {"options":[{"id":"string","title":"short","summary":"1-2 sentences","strategy":"keep_local"|"keep_remote"|"ai_merge"}]}
Provide exactly 2 or 3 options. Always include keep_remote and ai_merge when both sides have unique commits. Include keep_local only when local commits look valuable.
Titles must be plain and mobile-friendly. Do not invent file contents.`
					},
					{
						role: 'user',
						content: JSON.stringify({
							branch: ctx.branch,
							ahead: ctx.ahead,
							behind: ctx.behind,
							localCommits: ctx.localCommits,
							remoteCommits: ctx.remoteCommits,
							changedFiles: ctx.fileDiffs.map((f) => ({
								path: f.path,
								diffPreview: f.diff.slice(0, 1500)
							}))
						})
					}
				],
				temperature: 0.2,
				maxTokens: 1200
			});

			const parsed = (result.options ?? [])
				.filter(
					(o): o is ResolveOption =>
						!!o &&
						typeof o.id === 'string' &&
						typeof o.title === 'string' &&
						typeof o.summary === 'string' &&
						STRATEGIES.includes(o.strategy)
				)
				.slice(0, 3);

			options = parsed.length >= 2 ? parsed : fallbackOptions(ctx.ahead, ctx.behind);
		} catch (err) {
			if (err instanceof AiError) {
				return json({ message: err.message, needsAiKey: true }, { status: 400 });
			}
			options = fallbackOptions(ctx.ahead, ctx.behind);
		}

		return json({
			ahead: ctx.ahead,
			behind: ctx.behind,
			branch: ctx.branch,
			localCommits: ctx.localCommits,
			remoteCommits: ctx.remoteCommits,
			options
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		const message = err instanceof Error ? err.message : 'Failed to get resolve options';
		if (message === 'Repository not found') error(404, message);
		error(400, message);
	}
};
