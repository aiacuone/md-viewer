<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import SyncBar from '$lib/components/SyncBar.svelte';
	import CommitModal from '$lib/components/CommitModal.svelte';
	import { displayName } from '$lib/display';

	let { data } = $props();
	let commitOpen = $state(false);

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

<section class="stack">
	<div class="header-row">
		<div>
			<a class="muted" href="/?list=1">← All repos</a>
			<h1>{data.repo.name}</h1>
			<p class="muted">
				{data.repo.remoteUrl}
				{#if data.repo.contentRoot}
					· content root <code>{data.repo.contentRoot}</code>
				{/if}
			</p>
		</div>
		<SyncBar
			repoId={data.repo.id}
			status={data.status}
			onRefresh={refresh}
			onCommit={() => (commitOpen = true)}
		/>
	</div>

	<nav class="crumbs row">
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
</style>
