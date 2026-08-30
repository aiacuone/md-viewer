<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import SyncBar from '$lib/components/SyncBar.svelte';
	import CommitModal from '$lib/components/CommitModal.svelte';
	import BackLink from '$lib/components/BackLink.svelte';
	import FavouriteStar from '$lib/components/FavouriteStar.svelte';
	import { displayName, treeEntryLabel } from '$lib/display';
	import { goBack } from '$lib/navigation';

	let { data } = $props();
	let commitOpen = $state(false);
	let syncOpen = $state(false);
	let favourites = $state<string[]>([]);
	let starBusy = $state<string | null>(null);
	let starError = $state('');

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
</script>

<section class="stack repo-page">
	<div class="header-row">
		<div>
			<div class="desktop-only">
				<BackLink fallback="/?list=1" />
			</div>
			<h1>{data.repo.name}</h1>
			{#if data.repo.contentRoot}
				<p class="muted">content root <code>{data.repo.contentRoot}</code></p>
			{/if}
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

	<nav class="crumbs row desktop-only" aria-label="Breadcrumb">
		{#each crumbs as c, i}
			{#if i > 0}<span class="muted">/</span>{/if}
			<button type="button" class="crumb" onclick={() => openCrumb(c)}>{c.label}</button>
		{/each}
	</nav>

	{#if starError}
		<p class="error">{starError}</p>
	{/if}

	<div class="card tree">
		{#if sortedTree.length === 0}
			<p class="muted">No markdown files or folders here.</p>
		{:else}
			<ul>
				{#each sortedTree as entry}
					<li class="row-item">
						{#if entry.type === 'dir'}
							<button type="button" class="row-main dir" onclick={() => openPath(entry.path)}>
								<span>{entry.name}<span class="dir-slash">/</span></span>
							</button>
						{:else}
							<a
								class="row-main"
								href={`/repos/${data.repo.id}/file?path=${encodeURIComponent(entry.path)}`}
							>
								{treeEntryLabel(entry)}
							</a>
						{/if}
						<FavouriteStar
							favourited={favouriteSet.has(entry.path)}
							busy={starBusy === entry.path}
							label={treeEntryLabel(entry)}
							onclick={() => toggleStar(entry.path)}
						/>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>

<nav class="action-bar mobile-only" aria-label="Browse actions">
	<button type="button" class="action-back" onclick={() => goBack('/?list=1')} aria-label="Back">
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
	<div class="action-crumbs" aria-label="Breadcrumb">
		{#each crumbs as c, i}
			{#if i > 0}<span class="muted crumb-sep">/</span>{/if}
			<button type="button" class="crumb" onclick={() => openCrumb(c)}>{c.label}</button>
		{/each}
	</div>
	<button type="button" class="action-sync" onclick={() => (syncOpen = true)}>Sync</button>
</nav>

<CommitModal repoId={data.repo.id} bind:open={commitOpen} onCommitted={refresh} />

<style>
	h1 {
		margin: 0.35rem 0;
		letter-spacing: -0.03em;
	}

	.header-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.crumb {
		background: transparent;
		border: 0;
		padding: 0.2rem 0.35rem;
		color: var(--accent);
	}

	.tree ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.row-item {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 0.25rem;
	}

	.row-item + .row-item {
		border-top: 1px solid var(--border);
	}

	.row-main {
		display: grid;
		gap: 0.1rem;
		min-width: 0;
		width: 100%;
		text-align: left;
		padding: 0.7rem 0.15rem;
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

	.dir-slash {
		margin-left: 0.35em;
		color: var(--ink-muted);
	}

	code {
		font-family: var(--font-mono);
		font-size: 0.85em;
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

	.action-back {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
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

	.action-crumbs {
		display: flex;
		align-items: center;
		flex: 1 1 auto;
		min-width: 0;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		gap: 0.05rem;
		mask-image: linear-gradient(to right, #000 85%, transparent);
	}

	.action-crumbs::-webkit-scrollbar {
		display: none;
	}

	.action-crumbs .crumb {
		flex: 0 0 auto;
		padding: 0.45rem 0.3rem;
		font-size: 0.9rem;
		white-space: nowrap;
	}

	.crumb-sep {
		flex: 0 0 auto;
		font-size: 0.85rem;
	}

	.action-sync {
		flex: 0 0 auto;
		padding: 0.5rem 0.65rem;
		font-size: 0.85rem;
	}

	@media (max-width: 767px) {
		.repo-page {
			padding-bottom: calc(4.5rem + env(safe-area-inset-bottom));
		}
	}
</style>
