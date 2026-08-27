<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import SyncBar from '$lib/components/SyncBar.svelte';
	import CommitModal from '$lib/components/CommitModal.svelte';
	import BackLink from '$lib/components/BackLink.svelte';
	import { displayName } from '$lib/display';

	let { data } = $props();
	let commitOpen = $state(false);
	let syncOpen = $state(false);

	const crumbs = $derived.by(() => {
		const parts = data.path ? data.path.split('/').filter(Boolean) : [];
		const items = [{ label: data.repo.name, path: '' }];
		let acc = '';
		for (const part of parts) {
			acc = acc ? `${acc}/${part}` : part;
			items.push({ label: displayName(part), path: acc });
		}
		return items;
	});

	function openPath(path: string) {
		const q = path ? `?path=${encodeURIComponent(path)}` : '';
		goto(`/repos/${data.repo.id}${q}`);
	}

	async function refresh() {
		await invalidateAll();
	}
</script>

<section class="stack repo-page">
	<div class="header-row">
		<div>
			<div class="desktop-only">
				<BackLink href="/?list=1" label="Repos" />
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
			<button type="button" class="crumb" onclick={() => openPath(c.path)}>{c.label}</button>
		{/each}
	</nav>

	<div class="card tree">
		{#if data.tree.length === 0}
			<p class="muted">No markdown files or folders here.</p>
		{:else}
			<ul>
				{#each data.tree as entry}
					<li>
						{#if entry.type === 'dir'}
							<button type="button" onclick={() => openPath(entry.path)}>
								{entry.name}
							</button>
						{:else}
							<a href={`/repos/${data.repo.id}/file?path=${encodeURIComponent(entry.path)}`}>
								{displayName(entry.name)}
							</a>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>

<nav class="action-bar mobile-only" aria-label="Browse actions">
	<a class="action-back" href="/?list=1" aria-label="Back to Repos">
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
	<div class="action-crumbs" aria-label="Breadcrumb">
		{#each crumbs as c, i}
			{#if i > 0}<span class="muted crumb-sep">/</span>{/if}
			<button type="button" class="crumb" onclick={() => openPath(c.path)}>{c.label}</button>
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

	.tree li + li {
		border-top: 1px solid var(--border);
	}

	.tree a,
	.tree button {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.7rem 0.15rem;
		background: transparent;
		border: 0;
		color: inherit;
		text-decoration: none;
		border-radius: 0;
	}

	.tree a:hover,
	.tree button:hover {
		color: var(--accent);
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
