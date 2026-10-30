<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';
	import MarkdownEditor from '$lib/components/MarkdownEditor.svelte';
	import SyncBar from '$lib/components/SyncBar.svelte';
	import CommitModal from '$lib/components/CommitModal.svelte';
	import PasteNotesModal from '$lib/components/PasteNotesModal.svelte';
	import DeleteFileModal from '$lib/components/DeleteFileModal.svelte';
	import DiffView from '$lib/components/DiffView.svelte';
	import FileHeader from '$lib/components/FileHeader.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import FileActions from '$lib/components/FileActions.svelte';
	import type { DiffFile } from '$lib/types';
	import { displayName, syncCaption, treeEntryLabel } from '$lib/display';
	import { goBack } from '$lib/navigation';
	import { unifiedDiff } from '$lib/diff';
	import { renderMarkdown } from '$lib/markdown';
	import { clearDraft, draftKey, readDraft, writeDraft, type Draft } from '$lib/drafts';

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
	const fileCrumbs = $derived.by(() => {
		const items: { label: string; href?: string }[] = [{ label: data.repo.name, href: repoHref }];
		const parts = data.path.split('/').filter(Boolean);
		const file = parts.pop();
		let acc = '';
		for (const part of parts) {
			acc = acc ? `${acc}/${part}` : part;
			items.push({
				label: displayName(part),
				href: `/repos/${data.repo.id}?path=${encodeURIComponent(acc)}`
			});
		}
		if (file) items.push({ label: fileTitle });
		return items;
	});
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

	// Unsaved edits are kept on this device 1s after typing stops, so a
	// discarded tab or reload doesn't lose them. 'stale' means the file changed
	// (e.g. a pull) since the draft was made, so it waits for Restore/Discard.
	let draftNotice = $state<{ kind: 'restored' | 'stale'; draft: Draft } | null>(null);
	let pendingDraft: { key: string; draft: Draft } | null = null;
	let draftTimer: ReturnType<typeof setTimeout> | undefined;
	let loadedKey = '';
	const currentDraftKey = $derived(draftKey(data.repo.id, data.path));

	function flushDraft() {
		clearTimeout(draftTimer);
		if (pendingDraft) writeDraft(pendingDraft.key, pendingDraft.draft);
		pendingDraft = null;
	}

	function dropDraft() {
		clearTimeout(draftTimer);
		pendingDraft = null;
		clearDraft(currentDraftKey);
	}

	$effect(() => {
		const key = currentDraftKey;
		const fresh = data.content;
		untrack(() => {
			// Same file reloaded unchanged (e.g. after starring): keep the buffer.
			if (key === loadedKey && fresh === savedContent) return;
			flushDraft();
			loadedKey = key;
			content = fresh;
			savedContent = fresh;
			draftNotice = null;
			const draft = readDraft(key);
			if (!draft) return;
			if (draft.content === fresh) {
				clearDraft(key);
			} else if (draft.base === fresh) {
				content = draft.content;
				draftNotice = { kind: 'restored', draft };
			} else {
				draftNotice = { kind: 'stale', draft };
			}
		});
	});

	$effect(() => {
		const key = currentDraftKey;
		const next = content;
		const base = savedContent;
		untrack(() => {
			clearTimeout(draftTimer);
			pendingDraft = null;
			if (next === base) {
				// A stale draft is kept until the user restores or discards it.
				if (draftNotice?.kind !== 'stale') clearDraft(key);
				if (draftNotice?.kind === 'restored') draftNotice = null;
				return;
			}
			// Editing past a stale draft replaces it.
			if (draftNotice?.kind === 'stale') draftNotice = null;
			pendingDraft = { key, draft: { content: next, base, savedAt: Date.now() } };
			draftTimer = setTimeout(flushDraft, 1000);
		});
	});

	onDestroy(flushDraft);

	function restoreDraft() {
		if (!draftNotice) return;
		const { draft } = draftNotice;
		draftNotice = null;
		content = draft.content;
	}

	function discardDraft() {
		draftNotice = null;
		content = savedContent;
		dropDraft();
	}

	function formatDraftTime(ms: number) {
		return new Date(ms).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
	}

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
			dropDraft();
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

<svelte:window onbeforeunload={onBeforeUnload} onpagehide={flushDraft} />
<svelte:document onvisibilitychange={() => document.visibilityState === 'hidden' && flushDraft()} />

<section class="stack file-page">
	<FileHeader
		crumbs={fileCrumbs}
		title={fileTitle}
		backHref={repoHref}
		{favourited}
		busy={starBusy}
		onFavourite={toggleStar}
	>
		{#snippet toolbar()}
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
				{#if dirty}Unsaved · draft kept on this device{:else}Saved to working tree{/if}
				{#if viewMode === 'edit'} · Cmd/Ctrl+S to save{/if}
			</p>
		{/snippet}
	</FileHeader>

	{#if errorMsg}
		<p class="error">{errorMsg}</p>
	{/if}

	{#if draftNotice}
		<div class="card draft-notice" role="status">
			{#if draftNotice.kind === 'restored'}
				<p>Restored unsaved edits from {formatDraftTime(draftNotice.draft.savedAt)}.</p>
				<div class="row">
					<button type="button" onclick={() => (draftNotice = null)}>Keep</button>
					<button type="button" class="with-icon" onclick={discardDraft}>
						<Icon name="undo" />
						Discard
					</button>
				</div>
			{:else}
				<p>
					Unsaved edits from {formatDraftTime(draftNotice.draft.savedAt)} were made before this file
					last changed. Restoring replaces the current content.
				</p>
				<div class="row">
					<button type="button" class="primary" onclick={restoreDraft}>Restore</button>
					<button type="button" class="with-icon" onclick={discardDraft}>
						<Icon name="undo" />
						Discard
					</button>
				</div>
			{/if}
		</div>
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
			<article class="markdown-preview card">{@html html}</article>
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
	.pane {
		position: relative;
		min-height: min(70vh, 720px);
		min-width: 0;
		max-width: 100%;
		overflow-x: hidden;
	}

	.diff-panel {
		display: grid;
		gap: 1rem;
	}

	.draft-notice {
		display: grid;
		gap: 0.75rem;
	}

	.draft-notice p {
		margin: 0;
	}

	.diff-note {
		margin: 0;
		font-size: 0.85rem;
	}

	@media (max-width: 767px) {
		.file-page {
			padding-bottom: calc(4.5rem + env(safe-area-inset-bottom));
		}
	}
</style>
