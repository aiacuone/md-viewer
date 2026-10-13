<script lang="ts">
	import FileActions from '$lib/components/FileActions.svelte';
	import FavouriteStar from '$lib/components/FavouriteStar.svelte';
	import SyncBar from '$lib/components/SyncBar.svelte';

	let { data } = $props();

	const node = $derived(data.node);
	const parentHref = $derived(
		node.kind === 'file' ? (node.parent ? `/preview/${node.parent}` : '/preview') : '/preview'
	);
	const folders = $derived(node.kind === 'dir' ? node.entries.filter((entry) => entry.type === 'dir') : []);
	const files = $derived(node.kind === 'dir' ? node.entries.filter((entry) => entry.type === 'file') : []);
	const sampleStatus = {
		clean: true,
		uncommitted: [] as string[],
		ahead: 0,
		behind: 0,
		branch: 'main'
	};
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
			<h1>{node.path === '' ? 'Sample notes' : node.title}</h1>
		</div>

		{#if folders.length}
			<div class="card tree">
				<ul>
					{#each folders as entry}
						<li class="row-item">
							<a class="row-main dir" href="/preview/{entry.path}">{entry.name}</a>
							<FavouriteStar preview label={entry.name} />
						</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if files.length}
			<ul class="tree">
				{#each files as entry}
					<li class="row-item">
						<a class="row-main" href="/preview/{entry.path}">{entry.name}</a>
						<FavouriteStar preview label={entry.name} />
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{:else}
	<section class="stack file-page">
		<div class="header-row">
			<div>
				<h1>{node.title}</h1>
				<p class="muted file-path">{node.path}</p>
			</div>
			<div class="header-actions desktop-only">
				<FileActions part="header" preview />
			</div>
		</div>

		<SyncBar
			preview
			repoId="preview"
			status={sampleStatus}
			onRefresh={() => {}}
			onCommit={() => {}}
			showTrigger={false}
		/>

		<div class="desktop-only">
			<FileActions part="tools" preview viewMode="preview" />
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

	.header-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
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
