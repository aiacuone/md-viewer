<script lang="ts">
	import { marked } from 'marked';
	import { invalidateAll } from '$app/navigation';
	import MarkdownEditor from '$lib/components/MarkdownEditor.svelte';
	import SyncBar from '$lib/components/SyncBar.svelte';
	import CommitModal from '$lib/components/CommitModal.svelte';
	import DiffView from '$lib/components/DiffView.svelte';
	import BackLink from '$lib/components/BackLink.svelte';
	import type { DiffFile } from '$lib/types';
	import { displayName } from '$lib/display';
	import { unifiedDiff } from '$lib/diff';
	import { stripFrontMatter } from '$lib/markdown';

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

	const dirty = $derived(content !== savedContent);
	const html = $derived(marked.parse(stripFrontMatter(content), { async: false }) as string);
	const backHref = $derived(`/repos/${data.repo.id}`);
	const fileTitle = $derived(displayName(data.path.split('/').pop() ?? data.path));

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
				<BackLink href={backHref} label={data.repo.name} />
			</div>
			<h1>{fileTitle}</h1>
			<p class="muted">
				{#if dirty}Unsaved buffer{:else}Saved to working tree{/if}
				<span class="desktop-only">
					{#if viewMode === 'edit'}· Cmd/Ctrl+S to save{/if}
				</span>
			</p>
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
		{#if viewMode === 'edit'}
			<MarkdownEditor bind:value={content} onSave={save} />
		{:else}
			<article class="preview card">{@html html}</article>
		{/if}
	</div>
</section>

<nav class="action-bar mobile-only" aria-label="File actions">
	<a class="action-back" href={backHref} aria-label="Back to {data.repo.name}">
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
	</a>
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

	.header-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.pane {
		min-height: min(70vh, 720px);
		min-width: 0;
		max-width: 100%;
		overflow-x: hidden;
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
		line-height: 1.55;
	}

	.preview :global(pre) {
		overflow: auto;
		background: var(--bg);
		padding: 0.75rem;
		border-radius: 8px;
	}

	.preview :global(code) {
		font-family: var(--font-mono);
		font-size: 0.9em;
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
	}
</style>
