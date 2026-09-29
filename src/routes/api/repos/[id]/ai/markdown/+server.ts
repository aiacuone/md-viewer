import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoOrThrow } from '$lib/server/repos';
import { AiError, chatJson } from '$lib/server/ai';

function slugify(input: string): string {
	const base = input
		.toLowerCase()
		.replace(/['']/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
	return base || 'notes';
}

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		await getRepoOrThrow(params.id);
		const body = await request.json();
		const text = String(body.text ?? '').trim();
		const folder = String(body.folder ?? '')
			.trim()
			.replace(/^\/+|\/+$/g, '')
			.replace(/\\/g, '/');
		const titleHint = String(body.titleHint ?? '').trim();
		const mode = body.mode === 'append' ? 'append' : 'new';

		if (!text) error(400, 'Paste some text first');

		const result = await chatJson<{
			markdown?: string;
			filename?: string;
			title?: string;
		}>({
			messages: [
				{
					role: 'system',
					content: `You convert rough pasted notes into clean Markdown for a personal notes app.
Return JSON: {"markdown":"...","filename":"kebab-case-name.md","title":"Short Title"}
Rules:
- Use headings, lists, and short paragraphs as appropriate.
- Include YAML frontmatter with title, date (today ISO date), source: pasted, tags: [] only when a clear title exists or titleHint is provided.
- filename must be kebab-case ending in .md (no path segments).
- Do not wrap markdown in code fences.
- Preserve the user's meaning; do not invent facts.`
				},
				{
					role: 'user',
					content: JSON.stringify({
						mode,
						folder: folder || '(repo root)',
						titleHint: titleHint || null,
						today: new Date().toISOString().slice(0, 10),
						text
					})
				}
			],
			temperature: 0.3,
			maxTokens: 6000
		});

		let markdown = String(result.markdown ?? '').trim();
		if (!markdown) error(400, 'AI returned empty markdown');
		markdown = markdown.replace(/^```(?:markdown|md)?\n?/i, '').replace(/\n?```$/i, '');
		if (!markdown.endsWith('\n')) markdown += '\n';

		let filename = String(result.filename ?? '').trim();
		if (!/\.md$/i.test(filename)) {
			filename = `${slugify(titleHint || result.title || 'notes')}.md`;
		}
		filename = filename.split('/').pop()!.replace(/[^a-zA-Z0-9._-]/g, '-');
		if (!/\.(md|markdown)$/i.test(filename)) filename = `${filename}.md`;

		const suggestedPath = folder ? `${folder}/${filename}` : filename;

		return json({
			markdown,
			filename,
			suggestedPath,
			title: result.title ?? titleHint ?? null
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		if (err instanceof AiError) {
			return json({ message: err.message, needsAiKey: true }, { status: 400 });
		}
		const message = err instanceof Error ? err.message : 'AI markdown conversion failed';
		if (message === 'Repository not found') error(404, message);
		error(400, message);
	}
};
