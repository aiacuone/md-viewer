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

	const dirty = $derived(content !== savedContent);
	const html = $derived(marked.parse(stripFrontMatter(content), { async: false }) as string);

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

<section class="stack">
	<div class="header-row">
		<div>
			<BackLink href={`/repos/${data.repo.id}`} label={data.repo.name} />
			<h1>{displayName(data.path.split('/').pop() ?? data.path)}</h1>
			<p class="muted">
				{#if dirty}Unsaved buffer{:else}Saved to working tree{/if}
				{#if viewMode === 'edit'}· Cmd/Ctrl+S to save{/if}
			</p>
		</div>
		<SyncBar
			repoId={data.repo.id}
			status={data.status}
			onRefresh={refresh}
			onCommit={() => (commitOpen = true)}
		/>
	</div>

	<div class="row">
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
</style>
