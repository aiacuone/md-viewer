<script lang="ts">
	import { Marked } from 'marked';
	import { stripFrontMatter } from '$lib/markdown';

	type TreeEntry = { name: string; path: string; type: 'file' | 'dir' };

	let {
		repoId,
		folder = '',
		open = $bindable(false),
		onSaved
	}: {
		repoId: string;
		folder?: string;
		open?: boolean;
		onSaved: (path: string) => void | Promise<void>;
	} = $props();

	let text = $state('');
	let titleHint = $state('');
	let destFolder = $state('');
	let newSubfolder = $state('');
	let childDirs = $state<TreeEntry[]>([]);
	let mode = $state<'new' | 'append'>('new');
	let appendPath = $state('');
	let mdFiles = $state<TreeEntry[]>([]);
	let markdown = $state('');
	let suggestedPath = $state('');
	let busy = $state<'convert' | 'save' | 'tree' | null>(null);
	let errorMsg = $state('');
	let needsAiKey = $state(false);

	const pathLabel = $derived(destFolder ? destFolder.replace(/\//g, ' › ') : 'Repo root');
	const parentPath = $derived.by(() => {
		if (!destFolder) return null;
		const parts = destFolder.split('/').filter(Boolean);
		parts.pop();
		return parts.join('/');
	});

	const previewHtml = $derived.by(() => {
		if (!markdown) return '';
		const marked = new Marked();
		return marked.parse(stripFrontMatter(markdown), { async: false }) as string;
	});

	$effect(() => {
		if (open) {
			text = '';
			titleHint = '';
			newSubfolder = '';
			mode = 'new';
			appendPath = '';
			markdown = '';
			suggestedPath = '';
			errorMsg = '';
			needsAiKey = false;
			void openFolder(folder);
		}
	});

	function sanitizeFolderSegment(raw: string): string | null {
		const cleaned = raw
			.trim()
			.replace(/\\/g, '/')
			.replace(/^\/+|\/+$/g, '');
		if (!cleaned) return null;
		const parts = cleaned.split('/').filter(Boolean);
		const safe: string[] = [];
		for (const part of parts) {
			if (part === '.' || part === '..') continue;
			const seg = part
				.toLowerCase()
				.replace(/[^a-z0-9._-]+/g, '-')
				.replace(/^-+|-+$/g, '');
			if (seg) safe.push(seg);
		}
		return safe.length ? safe.join('/') : null;
	}

	async function openFolder(path: string) {
		busy = 'tree';
		errorMsg = '';
		const normalized = path.replace(/^\/+|\/+$/g, '').replace(/\\/g, '/');
		try {
			const q = normalized ? `?path=${encodeURIComponent(normalized)}` : '';
			const res = await fetch(`/api/repos/${repoId}/tree${q}`);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				// New / not-yet-created nested path — treat as empty folder you can nest into
				destFolder = normalized;
				childDirs = [];
				mdFiles = [];
				appendPath = '';
				return;
			}
			const entries = (Array.isArray(body) ? body : []) as TreeEntry[];
			destFolder = normalized;
			childDirs = entries.filter((e) => e.type === 'dir');
			mdFiles = entries.filter((e) => e.type === 'file');
			if (mode === 'append') {
				const paths = mdFiles.map((f) => f.path);
				appendPath = paths.includes(appendPath) ? appendPath : (paths[0] ?? '');
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load folder';
		} finally {
			busy = null;
		}
	}

	async function addSubfolder() {
		const nested = sanitizeFolderSegment(newSubfolder);
		if (!nested) {
			errorMsg = 'Enter a subfolder name (letters, numbers, dashes)';
			return;
		}
		errorMsg = '';
		const next = destFolder ? `${destFolder}/${nested}` : nested;
		newSubfolder = '';
		await openFolder(next);
	}

	function onSubfolderKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			void addSubfolder();
		}
	}

	async function convert() {
		if (!text.trim()) {
			errorMsg = 'Paste some text first';
			return;
		}
		if (mode === 'append' && !appendPath) {
			errorMsg = 'Choose a file to append to';
			return;
		}
		busy = 'convert';
		errorMsg = '';
		needsAiKey = false;
		try {
			const res = await fetch(`/api/repos/${repoId}/ai/markdown`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					text,
					folder: destFolder,
					titleHint,
					mode
				})
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				needsAiKey = Boolean(body.needsAiKey);
				throw new Error(body.message || 'Conversion failed');
			}
			markdown = body.markdown ?? '';
			suggestedPath = body.suggestedPath ?? '';
			if (mode === 'append' && appendPath) {
				suggestedPath = appendPath;
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Conversion failed';
		} finally {
			busy = null;
		}
	}

	async function save() {
		if (!markdown.trim()) {
			errorMsg = 'Convert to markdown first';
			return;
		}
		const path = mode === 'append' ? appendPath : suggestedPath;
		if (!path) {
			errorMsg = mode === 'append' ? 'Choose a file to append to' : 'Missing file path';
			return;
		}
		busy = 'save';
		errorMsg = '';
		try {
			let content = markdown;
			if (mode === 'append') {
				const existingRes = await fetch(
					`/api/repos/${repoId}/file?path=${encodeURIComponent(path)}`
				);
				const existingBody = await existingRes.json().catch(() => ({}));
				if (!existingRes.ok) throw new Error(existingBody.message || 'Failed to read file');
				const prev = String(existingBody.content ?? '');
				content = prev.replace(/\s*$/, '') + '\n\n' + markdown.replace(/^\s+/, '');
			}
			const res = await fetch(`/api/repos/${repoId}/file`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ path, content })
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.message || 'Save failed');
			open = false;
			await onSaved(path);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Save failed';
		} finally {
			busy = null;
		}
	}

	function close() {
		open = false;
	}

	$effect(() => {
		if (mode === 'append' && mdFiles.length) {
			const paths = mdFiles.map((f) => f.path);
			if (!paths.includes(appendPath)) appendPath = paths[0] ?? '';
		}
	});
</script>

{#if open}
	<div
		class="backdrop"
		role="button"
		tabindex="0"
		onclick={close}
		onkeydown={(e) => (e.key === 'Escape' || e.key === 'Enter') && close()}
	>
		<div
			class="dialog card"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="row" style="justify-content: space-between">
				<h2>Convert</h2>
				<button type="button" onclick={close}>Close</button>
			</div>

			<label>
				Notes
				<textarea rows="7" bind:value={text} placeholder="Paste or type notes to convert…"></textarea>
			</label>

			<label>
				Title hint (optional)
				<input bind:value={titleHint} placeholder="e.g. Solar cable prep" />
			</label>

			<div class="folder-picker">
				<div class="picker-head row">
					<div>
						<p class="muted label">Save in</p>
						<p class="path-label">{pathLabel}</p>
					</div>
					{#if parentPath !== null}
						<button
							type="button"
							class="back-btn"
							disabled={busy !== null}
							onclick={() => openFolder(parentPath ?? '')}
						>
							Back
						</button>
					{/if}
				</div>

				{#if busy === 'tree'}
					<p class="muted">Loading…</p>
				{:else}
					<div class="folder-grid" role="list">
						{#each childDirs as dir}
							<button
								type="button"
								class="grid-tile"
								role="listitem"
								disabled={busy !== null}
								onclick={() => openFolder(dir.path)}
							>
								<span class="tile-name">{dir.name}</span>
							</button>
						{/each}
					</div>
					{#if childDirs.length === 0}
						<p class="muted hint">No subfolders here yet — add one below or save in this folder.</p>
					{:else}
						<p class="muted hint">Tap a folder to go deeper, or convert to save here.</p>
					{/if}
				{/if}

				<div class="subfolder-row">
					<input
						bind:value={newSubfolder}
						placeholder="New subfolder (e.g. solar or electrical/solar)"
						disabled={busy !== null}
						onkeydown={onSubfolderKeydown}
					/>
					<button type="button" disabled={busy !== null} onclick={addSubfolder}>
						Add & open
					</button>
				</div>
			</div>

			<fieldset class="mode">
				<legend class="muted">Save as</legend>
				<label class="inline">
					<input type="radio" name="mode" value="new" bind:group={mode} />
					New file
				</label>
				<label class="inline">
					<input type="radio" name="mode" value="append" bind:group={mode} />
					Append to existing
				</label>
			</fieldset>

			{#if mode === 'append'}
				<div class="file-picker">
					<p class="muted label">File in this folder</p>
					{#if mdFiles.length === 0}
						<p class="muted hint">No markdown files here — go up or pick another folder.</p>
					{:else}
						<div class="folder-grid" role="list">
							{#each mdFiles as file}
								<button
									type="button"
									class="grid-tile file-tile"
									class:selected={appendPath === file.path}
									role="listitem"
									disabled={busy !== null}
									onclick={() => (appendPath = file.path)}
								>
									<span class="tile-name">{file.name}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<div class="row actions">
				<button type="button" class="primary" disabled={busy !== null} onclick={convert}>
					{busy === 'convert' ? 'Converting…' : 'Convert to markdown'}
				</button>
			</div>

			{#if markdown}
				<div class="dest-banner">
					<p class="muted label">Saving to</p>
					<p class="dest-path">
						{mode === 'append' ? appendPath || '…' : suggestedPath || '…'}
					</p>
				</div>
				<label>
					Markdown
					<textarea class="md-edit" rows="8" bind:value={markdown}></textarea>
				</label>
				{#if previewHtml}
					<div class="preview">{@html previewHtml}</div>
				{/if}
				<button type="button" class="primary" disabled={busy !== null} onclick={save}>
					{busy === 'save' ? 'Saving…' : 'Save'}
				</button>
			{/if}

			{#if errorMsg}
				<p class="error">{errorMsg}</p>
			{/if}
			{#if needsAiKey}
				<p class="muted">
					<a href="/settings">Add a DeepSeek API key in Settings</a> to use Convert.
				</p>
			{/if}
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		display: grid;
		place-items: center;
		padding: 1rem;
		z-index: 50;
	}

	.dialog {
		width: min(560px, 100%);
		max-height: min(92vh, 820px);
		overflow: auto;
		display: grid;
		gap: 0.75rem;
	}

	h2 {
		margin: 0;
		font-size: 1.1rem;
	}

	.actions {
		justify-content: flex-end;
	}

	.folder-picker,
	.file-picker {
		display: grid;
		gap: 0.55rem;
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
	}

	.picker-head {
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.label {
		margin: 0;
		font-size: 0.85rem;
	}

	.path-label {
		margin: 0.2rem 0 0;
		font-size: 0.95rem;
		font-weight: 600;
		word-break: break-word;
	}

	.back-btn {
		flex: 0 0 auto;
	}

	.folder-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.45rem;
		/* Lock to 2 rows (~4 tiles on mobile), scroll for the rest */
		--tile-h: 4.25rem;
		max-height: calc(var(--tile-h) * 2 + 0.45rem);
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		padding-right: 0.15rem;
	}

	@media (min-width: 480px) {
		.folder-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			/* 2 rows × 3 cols = 6 visible folders */
			max-height: calc(var(--tile-h) * 2 + 0.45rem);
		}
	}

	.grid-tile {
		display: grid;
		align-content: center;
		justify-items: center;
		height: var(--tile-h, 4.25rem);
		min-height: var(--tile-h, 4.25rem);
		padding: 0.75rem 0.5rem;
		background: var(--bg-soft);
		border: 1px solid var(--border);
		border-radius: 10px;
		text-align: center;
	}

	.grid-tile:hover:not(:disabled) {
		border-color: var(--accent);
		color: var(--accent);
	}

	.grid-tile.selected {
		border-color: var(--accent);
		box-shadow: inset 0 0 0 1px var(--accent);
	}

	.tile-name {
		font-size: 0.9rem;
		font-weight: 600;
		line-height: 1.25;
		word-break: break-word;
	}

	.hint {
		margin: 0;
		font-size: 0.82rem;
	}

	.subfolder-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.45rem;
		align-items: center;
	}

	.mode {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.85rem;
	}

	.mode legend {
		padding: 0;
		margin-bottom: 0.35rem;
		width: 100%;
		font-size: 0.85rem;
	}

	.inline {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		width: auto;
	}

	.path {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.85rem;
		word-break: break-all;
	}

	.dest-banner {
		display: grid;
		gap: 0.2rem;
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg-soft);
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.dest-path {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.9rem;
		font-weight: 600;
		word-break: break-all;
	}

	.md-edit {
		font-family: var(--font-mono);
		font-size: 0.85rem;
	}

	.preview {
		padding: 0.75rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		font-size: 0.92rem;
		max-height: 200px;
		overflow: auto;
	}

	.preview :global(h1),
	.preview :global(h2),
	.preview :global(h3) {
		margin: 0.6rem 0 0.35rem;
	}

	.preview :global(p),
	.preview :global(ul) {
		margin: 0.35rem 0;
	}

	.preview :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 0.5rem 0;
		font-size: 0.9em;
		border: 1px solid var(--border);
	}

	.preview :global(thead th) {
		background: var(--bg-soft);
		font-weight: 700;
		text-align: left;
	}

	.preview :global(th),
	.preview :global(td) {
		border: 1px solid var(--border);
		padding: 0.45rem 0.55rem;
		vertical-align: top;
	}
</style>
