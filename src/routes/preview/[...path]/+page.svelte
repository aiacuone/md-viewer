<script lang="ts">
	import FileActions from '$lib/components/FileActions.svelte';
	import BrowseChrome from '$lib/components/BrowseChrome.svelte';
	import FileHeader from '$lib/components/FileHeader.svelte';
	import FavouriteStar from '$lib/components/FavouriteStar.svelte';

	let { data } = $props();

	const node = $derived(data.node);
	const parentHref = $derived.by(() => {
		if (node.kind === 'dir' && node.path === '') return '/welcome';
		const parent =
			node.kind === 'file'
				? node.parent
				: node.path.includes('/')
					? node.path.slice(0, node.path.lastIndexOf('/'))
					: '';
		return parent ? `/preview/${parent}` : '/preview';
	});
	const folders = $derived(node.kind === 'dir' ? node.entries.filter((entry) => entry.type === 'dir') : []);
	const files = $derived(node.kind === 'dir' ? node.entries.filter((entry) => entry.type === 'file') : []);
	const crumbs = $derived.by(() => {
		const rel = node.kind === 'dir' ? node.path : node.parent;
		const parts = rel ? rel.split('/').filter(Boolean) : [];
		const items = [{ label: 'Home', href: '/welcome' }];
		let acc = '';
		for (const part of parts) {
			acc = acc ? `${acc}/${part}` : part;
			items.push({ label: part, href: `/preview/${acc}` });
		}
		if (node.kind === 'file') items.push({ label: node.title, href: '' });
		else if (items.length > 1) items[items.length - 1].href = '';
		return items;
	});
</script>

{#if node.kind === 'dir'}
	<section class="stack dir-page">
		<BrowseChrome
			title={node.path === '' ? 'Sample notes' : node.title}
			{crumbs}
			backHref={parentHref}
			branch="main"
			status="Clean working tree"
			preview
		/>

		<div class="listings">
			{#if folders.length}
				<div class="listing">
					<p class="section-label">Folders <span>{folders.length}</span></p>
					<div class="card tree">
						<ul>
							{#each folders as entry}
								<li class="row-item">
									<a class="row-main dir with-mark" href="/preview/{entry.path}">
										<span class="type-mark folder-mark" aria-hidden="true"></span>
										<span><strong>{entry.name}</strong><small class="row-sub">{entry.path}</small></span>
									</a>
									<FavouriteStar preview label={entry.name} />
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
									<a class="row-main with-mark" href="/preview/{entry.path}">
										<span class="type-mark file-mark" aria-hidden="true"></span>
										<span><strong>{entry.name}</strong><small class="row-sub">{entry.path}</small></span>
									</a>
									<FavouriteStar preview label={entry.name} />
								</li>
							{/each}
						</ul>
					</div>
				</div>
			{/if}
		</div>
	</section>
{:else}
	<section class="stack file-page">
		<FileHeader
			{crumbs}
			title={node.title}
			backHref={parentHref}
			preview
		>
			{#snippet toolbar()}
				<p class="sync-status">
					<strong>main</strong>
					<span>Clean working tree</span>
				</p>
				<FileActions part="tools" preview viewMode="preview" />
			{/snippet}
		</FileHeader>

		<div class="pane">
			<article class="markdown-preview card">{@html node.html}</article>
		</div>
	</section>

	<FileActions part="bar" preview backHref={parentHref} viewMode="preview" />
{/if}

<style>
	.pane {
		min-height: min(70vh, 720px);
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
		text-decoration: none;
		color: var(--accent);
	}

	.row-main.dir {
		font-weight: 600;
	}

	@media (max-width: 767px) {
		.file-page {
			padding-bottom: calc(4.5rem + env(safe-area-inset-bottom));
		}
	}
</style>
