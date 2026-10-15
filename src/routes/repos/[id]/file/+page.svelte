<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';
	import MarkdownEditor from '$lib/components/MarkdownEditor.svelte';
	import SyncBar from '$lib/components/SyncBar.svelte';
	import CommitModal from '$lib/components/CommitModal.svelte';
	import PasteNotesModal from '$lib/components/PasteNotesModal.svelte';
	import DeleteFileModal from '$lib/components/DeleteFileModal.svelte';
	import DiffView from '$lib/components/DiffView.svelte';
	import BackLink from '$lib/components/BackLink.svelte';
	import FavouriteStar from '$lib/components/FavouriteStar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import FileActions from '$lib/components/FileActions.svelte';
	import type { DiffFile } from '$lib/types';
	import { displayName, syncCaption, treeEntryLabel } from '$lib/display';
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
	let pasteOpen = $state(false);
	let deleteOpen = $state(false);
	let deleting = $state(false);
	let deleteError = $state('');
	let favourites = $state<string[]>([]);
	let starBusy = $state(false);
	let runPull = $state<(() => Promise<void>) | undefined>();
	let runPush = $state<(() => Promise<void>) | undefined>();

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
	const sync = $derived(syncCaption(data.status));
	const repoHref = $derived(`/repos/${data.repo.id}`);
	const parentFolder = $derived.by(() => {
		const parts = data.path.split('/').filter(Boolean);
		parts.pop();
		return parts.join('/');
	});

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

	async function onPasteSaved(path: string) {
		await refresh();
		await goto(`/repos/${data.repo.id}/file?path=${encodeURIComponent(path)}`);
	}

	async function confirmDelete() {
		deleting = true;
		deleteError = '';
		errorMsg = '';
		try {
			const res = await fetch(
				`/api/repos/${data.repo.id}/file?path=${encodeURIComponent(data.path)}`,
				{ method: 'DELETE' }
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.message || 'Delete failed');
			deleteOpen = false;
			const folder = parentFolder;
			const q = folder ? `?path=${encodeURIComponent(folder)}` : '';
			await goto(`/repos/${data.repo.id}${q}`);
			await invalidateAll();
		} catch (err) {
			deleteError = err instanceof Error ? err.message : 'Delete failed';
		} finally {
			deleting = false;
		}
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
			<p class="breadcrumb">{data.repo.name}{data.path ? ` / ${data.path}` : ''}</p>
			<div class="title-row">
				<div class="desktop-only">
					<BackLink fallback={repoHref} />
				</div>
				<h1>{fileTitle}</h1>
				<FavouriteStar
					favourited={favourited}
					busy={starBusy}
					label={fileTitle}
					onclick={toggleStar}
				/>
			</div>
			<p class="muted file-path" title={data.path}>{data.path}</p>
		</div>
	</div>

	<div class="file-toolbar desktop-only">
		<p class="sync-status">
			<strong>{sync.branch}</strong>
			<span>{sync.detail}</span>
		</p>
		<FileActions
			part="tools"
			{viewMode}
			{showDiff}
			{dirty}
			{saving}
			onView={(mode) => (viewMode = mode)}
			onSave={save}
			onConvert={() => (pasteOpen = true)}
			onPull={() => runPull?.()}
			onPush={() => runPush?.()}
			onDiff={toggleDiff}
			onDelete={() => {
				deleteError = '';
				deleteOpen = true;
			}}
		/>
		<p class="saved-note" aria-live="polite">
			{#if dirty}Unsaved buffer{:else}Saved to working tree{/if}
			{#if viewMode === 'edit'} · Cmd/Ctrl+S to save{/if}
		</p>
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
						<button type="button" class="with-icon" onclick={() => applyContent(savedContent)}>
							<Icon name="undo" />
							Discard unsaved edits
						</button>
					{/if}
					{#if savedDiff}
						<button type="button" class="with-icon" onclick={revertToHead}>
							<Icon name="undo" />
							Revert file to last commit
						</button>
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

<FileActions
	part="bar"
	{viewMode}
	{showDiff}
	{dirty}
	{saving}
	onBack={() => goBack(repoHref)}
	onView={(mode) => (viewMode = mode)}
	onSave={save}
	onConvert={() => (pasteOpen = true)}
	onSync={() => (syncOpen = true)}
	onDiff={toggleDiff}
	onDelete={() => {
		deleteError = '';
		deleteOpen = true;
	}}
/>

<CommitModal repoId={data.repo.id} bind:open={commitOpen} onCommitted={refresh} />
<PasteNotesModal
	repoId={data.repo.id}
	folder={parentFolder}
	bind:open={pasteOpen}
	onSaved={onPasteSaved}
/>
<DeleteFileModal
	filePath={data.path}
	bind:open={deleteOpen}
	busy={deleting}
	errorMsg={deleteError}
	hasUnsaved={dirty}
	onConfirm={confirmDelete}
/>
<SyncBar
	repoId={data.repo.id}
	status={data.status}
	onRefresh={refresh}
	onCommit={() => (commitOpen = true)}
	bind:open={syncOpen}
	bind:runPull
	bind:runPush
	showTrigger={false}
/>
<style>
	h1 {
		margin: 0;
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

	.file-path {
		margin: 0.15rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.8rem;
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
		position: relative;
		min-height: min(70vh, 720px);
		min-width: 0;
		max-width: 100%;
		overflow-x: hidden;
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
		border-radius: var(--radius);
		font-size: 0.92em;
	}

	.preview :global(code) {
		font-family: var(--font-mono);
		font-size: 0.88em;
	}

	.preview :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 0.75em 0;
		font-size: 0.95em;
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
	}

	.preview :global(thead th) {
		background: var(--bg-soft);
		font-weight: 700;
		text-align: left;
	}

	.preview :global(th),
	.preview :global(td) {
		border: 1px solid var(--border);
		padding: 0.55rem 0.7rem;
		vertical-align: top;
	}

	.diff-panel {
		display: grid;
		gap: 1rem;
	}

	.diff-note {
		margin: 0;
		font-size: 0.85rem;
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
