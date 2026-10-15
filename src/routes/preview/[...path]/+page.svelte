<script lang="ts">
	import FileActions from '$lib/components/FileActions.svelte';
	import FavouriteStar from '$lib/components/FavouriteStar.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();

	const node = $derived(data.node);
	const parentHref = $derived(
		node.kind === 'file' ? (node.parent ? `/preview/${node.parent}` : '/preview') : '/preview'
	);
	const folders = $derived(node.kind === 'dir' ? node.entries.filter((entry) => entry.type === 'dir') : []);
	const files = $derived(node.kind === 'dir' ? node.entries.filter((entry) => entry.type === 'file') : []);
	const crumbs = $derived.by(() => {
		const rel = node.kind === 'dir' ? node.path : node.parent;
		const parts = rel ? rel.split('/').filter(Boolean) : [];
		const items = [{ label: 'Home', href: '/preview' }];
		let acc = '';
		for (const part of parts) {
			acc = acc ? `${acc}/${part}` : part;
			items.push({ label: part, href: `/preview/${acc}` });
		}
		if (node.kind === 'file') items.push({ label: node.title, href: '' });
		return items;
	});
</script>

{#if node.kind === 'dir'}
	<section class="stack dir-page">
		{#if node.path === ''}
			<div class="card about">
				<h1>About</h1>
				<p>{data.aboutText}</p>
				<p class="muted">{data.tools.join(', ')}. {data.aboutPlatform}</p>
			</div>
		{/if}

		<div class="header-row">
			<div>
				<p class="breadcrumb">{crumbs.map((crumb) => crumb.label).join(' / ')}</p>
				<h1>{node.path === '' ? 'Sample notes' : node.title}</h1>
			</div>
			<div class="file-toolbar">
				<p class="sync-status">
					<strong>main</strong>
					<span>Clean working tree</span>
				</p>
				<div class="tool-group">
					<button type="button" class="icon-btn" data-preview-disabled aria-label="Pull" title="Pull">
						<Icon name="pull" />
					</button>
					<button type="button" class="icon-btn" data-preview-disabled aria-label="Push" title="Push">
						<Icon name="push" />
					</button>
				</div>
			</div>
		</div>

		<nav class="crumbs" aria-label="Breadcrumb">
			{#each crumbs as crumb, i}
				{#if i > 0}<span class="muted">/</span>{/if}
				{#if i < crumbs.length - 1 && crumb.href}
					<a href={crumb.href}>{crumb.label}</a>
				{:else}
					<strong>{crumb.label}</strong>
				{/if}
			{/each}
		</nav>

		{#if folders.length}
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
		{/if}
		{#if files.length}
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
		{/if}
	</section>
{:else}
	<section class="stack file-page">
		<div class="header-row">
			<div>
				<p class="breadcrumb">{crumbs.map((crumb) => crumb.label).join(' / ')}</p>
				<h1>{node.title}</h1>
				<p class="muted file-path">{node.path}</p>
			</div>
		</div>

		<div class="file-toolbar">
			<p class="sync-status">
				<strong>main</strong>
				<span>Clean working tree</span>
			</p>
			<FileActions part="tools" preview viewMode="preview" />
			<p class="saved-note">Saved to working tree</p>
		</div>

		<div class="pane">
			<article class="preview card">{@html node.html}</article>
		</div>
	</section>

	<FileActions part="bar" preview backHref={parentHref} viewMode="preview" />
{/if}

<style>
	.dir-page h1 {
		margin: 0;
		letter-spacing: -0.03em;
	}

	.file-page h1,
	.about h1 {
		margin: 0;
		font-size: 1.25rem;
	}

	.about h1 {
		margin-bottom: 0.35rem;
	}

	.about p {
		margin: 0.45rem 0 0;
		line-height: 1.45;
	}

	.header-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.file-path {
		margin: 0.15rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.8rem;
	}

	.pane {
		min-height: min(70vh, 720px);
	}

	.preview {
		overflow: auto;
		min-height: min(70vh, 720px);
		font-size: 0.85rem;
		line-height: 1.5;
		padding: 0.85rem 0.95rem;
	}

	.preview :global(h1) {
		font-size: 1.45em;
		margin: 0.55em 0 0.2em;
	}

	.preview :global(p),
	.preview :global(ul) {
		margin: 0.55em 0;
	}

	.preview :global(pre) {
		overflow: auto;
		background: var(--bg);
		padding: 0.65rem;
		border-radius: var(--radius);
		font-size: 0.92em;
	}

	.tree ul,
	ul.tree {
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
		.desktop-only {
			display: none !important;
		}

		.file-page {
			padding-bottom: calc(4.5rem + env(safe-area-inset-bottom));
		}
	}
</style>
