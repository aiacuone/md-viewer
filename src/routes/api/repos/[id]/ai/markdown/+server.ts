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

function cleanMarkdown(raw: unknown): string {
	let markdown = String(raw ?? '').trim();
	markdown = markdown.replace(/^```(?:markdown|md)?\n?/i, '').replace(/\n?```$/i, '');
	if (markdown && !markdown.endsWith('\n')) markdown += '\n';
	return markdown;
}

async function adjustMarkdown(markdown: string, instruction: string): Promise<string> {
	const result = await chatJson<{ markdown?: string }>({
		messages: [
			{
				role: 'system',
				content: `You revise Markdown notes for a personal notes app according to the user's instruction.
Return JSON: {"markdown":"..."}
Rules:
- Apply only the requested change; keep everything else as-is.
- Keep YAML frontmatter unless the instruction asks to change it.
- Do not wrap markdown in code fences.
- Preserve the user's meaning; do not invent facts.`
			},
			{ role: 'user', content: JSON.stringify({ instruction, markdown }) }
		],
		temperature: 0.3,
		maxTokens: 6000
	});
	const revised = cleanMarkdown(result.markdown);
	if (!revised) error(400, 'AI returned empty markdown');
	return revised;
}

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		await getRepoOrThrow(params.id);
		const body = await request.json();

		if (body.instruction !== undefined) {
			const instruction = String(body.instruction ?? '').trim();
			const current = String(body.markdown ?? '');
			if (!instruction) error(400, 'Describe the adjustment first');
			if (!current.trim()) error(400, 'Nothing to adjust');
			return json({ markdown: await adjustMarkdown(current, instruction) });
		}

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

		const markdown = cleanMarkdown(result.markdown);
		if (!markdown) error(400, 'AI returned empty markdown');

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
