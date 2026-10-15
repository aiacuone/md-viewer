<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import SyncBar from '$lib/components/SyncBar.svelte';
	import CommitModal from '$lib/components/CommitModal.svelte';
	import PasteNotesModal from '$lib/components/PasteNotesModal.svelte';
	import BrowseChrome from '$lib/components/BrowseChrome.svelte';
	import FavouriteStar from '$lib/components/FavouriteStar.svelte';
	import { displayName, syncCaption, treeEntryLabel } from '$lib/display';
	import { goBack } from '$lib/navigation';

	let { data } = $props();
	let commitOpen = $state(false);
	let syncOpen = $state(false);
	let pasteOpen = $state(false);
	let favourites = $state<string[]>([]);
	let starBusy = $state<string | null>(null);
	let starError = $state('');
	let runPull = $state<(() => Promise<void>) | undefined>();
	let runPush = $state<(() => Promise<void>) | undefined>();

	$effect(() => {
		favourites = data.favourites;
	});

	const favouriteSet = $derived(new Set(favourites));

	const sortedTree = $derived.by(() => {
		const entries = [...data.tree];
		entries.sort((a, b) => {
			const aFav = favouriteSet.has(a.path) ? 0 : 1;
			const bFav = favouriteSet.has(b.path) ? 0 : 1;
			if (aFav !== bFav) return aFav - bFav;
			return 0;
		});
		return entries;
	});
	const sync = $derived(syncCaption(data.status));
	const folders = $derived(sortedTree.filter((entry) => entry.type === 'dir'));
	const files = $derived(sortedTree.filter((entry) => entry.type === 'file'));

	const crumbs = $derived.by(() => {
		const parts = data.path ? data.path.split('/').filter(Boolean) : [];
		const items: { label: string; href?: string; path?: string }[] = [
			{ label: 'Home', href: '/?list=1' },
			{ label: data.repo.name, path: '' }
		];
		let acc = '';
		for (const part of parts) {
			acc = acc ? `${acc}/${part}` : part;
			items.push({ label: displayName(part), path: acc });
		}
		return items;
	});

	function openCrumb(c: { href?: string; path?: string }) {
		if (c.href) {
			goto(c.href);
			return;
		}
		openPath(c.path ?? '');
	}

	function openPath(path: string) {
		const q = path ? `?path=${encodeURIComponent(path)}` : '';
		goto(`/repos/${data.repo.id}${q}`);
	}

	async function toggleStar(path: string) {
		starBusy = path;
		starError = '';
		try {
			const res = await fetch(`/api/repos/${data.repo.id}/favourite`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ path })
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.message || 'Failed to update favourite');
			favourites = body.favourites ?? [];
			await invalidateAll();
		} catch (err) {
			starError = err instanceof Error ? err.message : 'Failed to update favourite';
		} finally {
			starBusy = null;
		}
	}

	async function refresh() {
		await invalidateAll();
	}

	async function onPasteSaved(path: string) {
		await refresh();
		await goto(`/repos/${data.repo.id}/file?path=${encodeURIComponent(path)}`);
	}
</script>

<section class="stack repo-page">
	<BrowseChrome
		title={data.repo.name}
		{crumbs}
		backHref="/?list=1"
		branch={sync.branch}
		status={sync.detail}
		contentRoot={data.repo.contentRoot}
		onCrumb={(index) => openCrumb(crumbs[index])}
		onBack={() => goBack('/?list=1')}
		onConvert={() => (pasteOpen = true)}
		onPull={() => runPull?.()}
		onPush={() => runPush?.()}
		onSync={() => (syncOpen = true)}
	/>

	{#if starError}
		<p class="error">{starError}</p>
	{/if}

	{#if sortedTree.length === 0}
		<div class="card tree">
			<p class="muted">No markdown files or folders here.</p>
		</div>
	{:else}
		<div class="listings">
			{#if folders.length}
				<div class="listing">
					<p class="section-label">Folders <span>{folders.length}</span></p>
					<div class="card tree">
						<ul>
							{#each folders as entry}
								<li class="row-item">
									<button type="button" class="row-main dir with-mark" onclick={() => openPath(entry.path)}>
										<span class="type-mark folder-mark" aria-hidden="true"></span>
										<span><strong>{treeEntryLabel(entry)}</strong><small class="row-sub">{entry.path || entry.name}</small></span>
									</button>
									<FavouriteStar
										favourited={favouriteSet.has(entry.path)}
										busy={starBusy === entry.path}
										label={treeEntryLabel(entry)}
										onclick={() => toggleStar(entry.path)}
									/>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			{/if}
			{#if files.length}
				<div class="listing">
					<p class="section-label">Markdown files <span>{files.length}</span></p>
					<div class="card tree">
						<ul>
						{#each files as entry}
							<li class="row-item">
								<a
									class="row-main with-mark"
									href={`/repos/${data.repo.id}/file?path=${encodeURIComponent(entry.path)}`}
								>
									<span class="type-mark file-mark" aria-hidden="true"></span>
									<span><strong>{treeEntryLabel(entry)}</strong><small class="row-sub">{entry.path}</small></span>
								</a>
								<FavouriteStar
									favourited={favouriteSet.has(entry.path)}
									busy={starBusy === entry.path}
									label={treeEntryLabel(entry)}
									onclick={() => toggleStar(entry.path)}
								/>
							</li>
						{/each}
						</ul>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</section>

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

<CommitModal repoId={data.repo.id} bind:open={commitOpen} onCommitted={refresh} />
<PasteNotesModal
	repoId={data.repo.id}
	folder={data.path}
	bind:open={pasteOpen}
	onSaved={onPasteSaved}
/>

<style>
	.tree ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.row-item {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 0.2rem;
	}

	.row-item :global(.star) {
		width: 2rem;
		height: 2rem;
	}

	.row-item + .row-item {
		border-top: 1px solid var(--border);
	}

	.row-main.with-mark {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.row-main {
		display: grid;
		gap: 0.1rem;
		min-width: 0;
		width: 100%;
		text-align: left;
		padding: 0.55rem 0.7rem;
		background: transparent;
		border: 0;
		color: inherit;
		text-decoration: none;
		border-radius: 0;
	}

	.row-main:hover {
		color: var(--accent);
	}

	.row-main.dir {
		font-weight: 600;
	}

	@media (max-width: 767px) {
		.repo-page {
			padding-bottom: calc(4.5rem + env(safe-area-inset-bottom));
		}
	}
</style>
