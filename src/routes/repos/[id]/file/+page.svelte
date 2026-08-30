<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import MarkdownEditor from '$lib/components/MarkdownEditor.svelte';
	import SyncBar from '$lib/components/SyncBar.svelte';
	import CommitModal from '$lib/components/CommitModal.svelte';
	import DiffView from '$lib/components/DiffView.svelte';
	import BackLink from '$lib/components/BackLink.svelte';
	import FavouriteStar from '$lib/components/FavouriteStar.svelte';
	import type { DiffFile } from '$lib/types';
	import { displayName, treeEntryLabel } from '$lib/display';
	import { goBack } from '$lib/navigation';
	import { unifiedDiff } from '$lib/diff';
	import { renderMarkdown } from '$lib/markdown';

	let { data } = $props();

	let content = $state('');
	let savedContent = $state('');
	let viewMode = $state<'preview' | 'edit'>('preview');
	let showDiff = $state(false);
	let savedDiff = $state<DiffFile | null>(null);
	let saving = $state(false);
	let errorMsg = $state('');
	let commitOpen = $state(false);
	let syncOpen = $state(false);
	let favourites = $state<string[]>([]);
	let starBusy = $state(false);

	$effect(() => {
		favourites = data.favourites;
	});

	const favourited = $derived(favourites.includes(data.path));

	const dirty = $derived(content !== savedContent);
	const html = $derived(
		renderMarkdown(content, {
			repoId: data.repo.id,
			filePath: data.path,
			contentRoot: data.repo.contentRoot || undefined
		})
	);
	const fileTitle = $derived(treeEntryLabel({ name: data.path.split('/').pop() ?? data.path, path: data.path, type: 'file' }));
	const repoHref = $derived(`/repos/${data.repo.id}`);

	const unsavedDiff = $derived.by((): DiffFile | null => {
		if (content === savedContent) return null;
		return {
			path: data.path,
			status: 'modified',
			diff: unifiedDiff(data.path, savedContent, content)
		};
	});

	$effect(() => {
		content = data.content;
		savedContent = data.content;
	});

	async function loadSavedDiff() {
		const res = await fetch(
			`/api/repos/${data.repo.id}/diff?path=${encodeURIComponent(data.path)}`
		);
		const body = await res.json();
		if (!res.ok) throw new Error(body.message || 'Failed to load diff');
		const files = body as DiffFile[];
		savedDiff = files[0] ?? null;
	}

	async function save() {
		saving = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/repos/${data.repo.id}/file`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ path: data.path, content })
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.message || 'Save failed');
			savedContent = content;
			await invalidateAll();
			if (showDiff) await loadSavedDiff();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Save failed';
		} finally {
			saving = false;
		}
	}

	async function toggleDiff() {
		if (showDiff) {
			showDiff = false;
			return;
		}
		errorMsg = '';
		try {
			await loadSavedDiff();
			showDiff = true;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load diff';
		}
	}

	async function refresh() {
		await invalidateAll();
	}

	async function toggleStar() {
		starBusy = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/repos/${data.repo.id}/favourite`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ path: data.path })
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.message || 'Failed to update favourite');
			favourites = body.favourites ?? [];
			await invalidateAll();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to update favourite';
		} finally {
			starBusy = false;
		}
	}

	function applyContent(next: string) {
		content = next;
		viewMode = 'edit';
	}

	async function revertToHead() {
		try {
			const res = await fetch(
				`/api/repos/${data.repo.id}/file?path=${encodeURIComponent(data.path)}&ref=HEAD`
			);
			const body = await res.json();
			if (!res.ok) throw new Error(body.message || 'Failed to load last commit');
			content = body.content;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to revert';
		}
	}

	function onBeforeUnload(e: BeforeUnloadEvent) {
		if (dirty) {
			e.preventDefault();
			e.returnValue = '';
		}
	}
</script>

<svelte:window onbeforeunload={onBeforeUnload} />

<section class="stack file-page">
	<div class="header-row">
		<div>
			<div class="desktop-only">
				<BackLink fallback={repoHref} />
			</div>
			<div class="title-row">
				<h1>{fileTitle}</h1>
				<FavouriteStar
					favourited={favourited}
					busy={starBusy}
					label={fileTitle}
					onclick={toggleStar}
				/>
			</div>
		</div>
		<SyncBar
			repoId={data.repo.id}
			status={data.status}
			onRefresh={refresh}
			onCommit={() => (commitOpen = true)}
			bind:open={syncOpen}
			triggerClass="desktop-only"
		/>
	</div>

	<div class="row desktop-only">
		<button class="primary" type="button" disabled={saving || !dirty} onclick={save}>
			{saving ? 'Saving…' : 'Save'}
		</button>
		<div class="view-toggle" role="group" aria-label="View mode">
			<button
				type="button"
				class:active={viewMode === 'preview'}
				onclick={() => (viewMode = 'preview')}
			>
				Preview
			</button>
			<button
				type="button"
				class:active={viewMode === 'edit'}
				onclick={() => (viewMode = 'edit')}
			>
				Edit
			</button>
		</div>
		<button type="button" onclick={toggleDiff}>
			{showDiff ? 'Hide diff' : 'View diff'}
		</button>
	</div>

	{#if errorMsg}
		<p class="error">{errorMsg}</p>
	{/if}

	{#if showDiff}
		<div class="card diff-panel">
			{#if unsavedDiff}
				<DiffView
					diff={unsavedDiff.diff}
					path={unsavedDiff.path}
					status={unsavedDiff.status}
					compareLabel="Unsaved editor changes (not committed)"
					interactive
					content={content}
					onRevert={applyContent}
				/>
			{/if}
			{#if savedDiff}
				<DiffView
					diff={savedDiff.diff}
					path={savedDiff.path}
					status={savedDiff.status}
					compareLabel="Saved file vs last commit"
					interactive={!dirty}
					content={content}
					onRevert={applyContent}
				/>
				{#if dirty}
					<p class="muted diff-note">Save or discard unsaved edits to revert saved changes line by line.</p>
				{/if}
			{:else if !unsavedDiff}
				<p class="muted">No changes vs last commit for this file.</p>
			{/if}
			{#if savedDiff || unsavedDiff}
				<div class="row">
					{#if unsavedDiff}
						<button type="button" onclick={() => applyContent(savedContent)}>
							Discard unsaved edits
						</button>
					{/if}
					{#if savedDiff}
						<button type="button" onclick={revertToHead}>Revert file to last commit</button>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<div class="pane">
		<p class="muted save-status" aria-live="polite">
			{#if dirty}Unsaved buffer{:else}Saved to working tree{/if}
			<span class="desktop-only">
				{#if viewMode === 'edit'} · Cmd/Ctrl+S to save{/if}
			</span>
		</p>
		{#if viewMode === 'edit'}
			<MarkdownEditor bind:value={content} onSave={save} />
		{:else}
			<article class="preview card">{@html html}</article>
		{/if}
	</div>
</section>

<nav class="action-bar mobile-only" aria-label="File actions">
	<button type="button" class="action-back" onclick={() => goBack(repoHref)} aria-label="Back">
		<svg viewBox="0 0 14 14" aria-hidden="true">
			<path
				d="M8.75 2.25 3.5 7l5.25 4.75"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</button>
	<div class="view-toggle" role="group" aria-label="View mode">
		<button
			type="button"
			class:active={viewMode === 'preview'}
			onclick={() => (viewMode = 'preview')}
		>
			Preview
		</button>
		<button
			type="button"
			class:active={viewMode === 'edit'}
			onclick={() => (viewMode = 'edit')}
		>
			Edit
		</button>
	</div>
	<button class="primary action-save" type="button" disabled={saving || !dirty} onclick={save}>
		{saving ? '…' : 'Save'}
		{#if dirty && !saving}<span class="dirty-dot" aria-hidden="true"></span>{/if}
	</button>
	<button type="button" onclick={() => (syncOpen = true)}>Sync</button>
	<button type="button" onclick={toggleDiff}>{showDiff ? 'Hide' : 'Diff'}</button>
</nav>

<CommitModal repoId={data.repo.id} bind:open={commitOpen} onCommitted={refresh} />

<style>
	h1 {
		margin: 0.35rem 0;
		font-size: 1.25rem;
		word-break: break-all;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		min-width: 0;
	}

	.title-row h1 {
		min-width: 0;
		flex: 1 1 auto;
	}

	.header-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.pane {
		position: relative;
		min-height: min(70vh, 720px);
		min-width: 0;
		max-width: 100%;
		overflow-x: hidden;
	}

	.save-status {
		position: absolute;
		top: 0.2rem;
		right: 0.25rem;
		z-index: 2;
		margin: 0;
		padding: 0.1rem 0.3rem;
		font-size: 0.65rem;
		line-height: 1.2;
		pointer-events: none;
		border-radius: 4px;
		opacity: 0.4;
		background: color-mix(in srgb, var(--bg-elevated) 75%, transparent);
	}

	.view-toggle {
		display: inline-flex;
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
	}

	.view-toggle button {
		border: 0;
		border-radius: 0;
		background: transparent;
	}

	.view-toggle button + button {
		border-left: 1px solid var(--border);
	}

	.view-toggle button.active {
		background: var(--bg-soft);
		color: var(--accent);
		font-weight: 600;
	}

	.preview {
		overflow: auto;
		min-height: min(70vh, 720px);
		font-size: 0.85rem;
		line-height: 1.5;
		letter-spacing: -0.015em;
		padding: 0.85rem 0.95rem;
	}

	.preview :global(h1),
	.preview :global(h2),
	.preview :global(h3),
	.preview :global(h4),
	.preview :global(h5),
	.preview :global(h6) {
		line-height: 1.2;
		letter-spacing: -0.025em;
	}

	.preview :global(h1) {
		font-size: 1.45em;
		margin: 0.55em 0 0.2em;
	}

	.preview :global(h2) {
		font-size: 1.25em;
		margin: 0.55em 0 0.18em;
	}

	.preview :global(h3) {
		font-size: 1.1em;
		margin: 0.5em 0 0.15em;
	}

	.preview :global(h4),
	.preview :global(h5),
	.preview :global(h6) {
		font-size: 1em;
		margin: 0.45em 0 0.15em;
	}

	.preview :global(p),
	.preview :global(ul),
	.preview :global(ol) {
		margin: 0.55em 0;
	}

	.preview :global(pre) {
		overflow: auto;
		background: var(--bg);
		padding: 0.65rem;
		border-radius: 8px;
		font-size: 0.92em;
	}

	.preview :global(code) {
		font-family: var(--font-mono);
		font-size: 0.88em;
	}

	.diff-panel {
		display: grid;
		gap: 1rem;
	}

	.diff-note {
		margin: 0;
		font-size: 0.85rem;
	}

	.action-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 40;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 0.65rem calc(0.55rem + env(safe-area-inset-bottom));
		background: color-mix(in srgb, var(--bg-elevated) 92%, transparent);
		border-top: 1px solid var(--border);
		backdrop-filter: blur(10px);
		box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
	}

	.action-bar .view-toggle {
		flex: 1 1 auto;
		min-width: 0;
	}

	.action-bar .view-toggle button {
		flex: 1;
		padding: 0.5rem 0.35rem;
		font-size: 0.85rem;
	}

	.action-bar > button,
	.action-back {
		flex: 0 0 auto;
		padding: 0.5rem 0.55rem;
		font-size: 0.85rem;
	}

	.action-back {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.4rem;
		height: 2.4rem;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg-soft);
		color: var(--ink);
		text-decoration: none;
	}

	.action-back:hover {
		text-decoration: none;
		color: var(--ink);
	}

	.action-back svg {
		width: 0.95rem;
		height: 0.95rem;
	}

	.action-save {
		position: relative;
		min-width: 3.4rem;
	}

	.dirty-dot {
		position: absolute;
		top: 0.3rem;
		right: 0.3rem;
		width: 0.4rem;
		height: 0.4rem;
		border-radius: 50%;
		background: var(--accent-ink);
	}

	@media (max-width: 767px) {
		.file-page {
			padding-bottom: calc(4.5rem + env(safe-area-inset-bottom));
		}

		h1 {
			margin-top: 0;
		}
	}
</style>
