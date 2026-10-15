<script lang="ts">
	import type { Snippet } from 'svelte';
	import BackLink from './BackLink.svelte';
	import FavouriteStar from './FavouriteStar.svelte';
	import Icon from './Icon.svelte';

	type Crumb = { label: string; href?: string };

	let {
		crumbs,
		title,
		backHref,
		preview = false,
		favourited = false,
		busy = false,
		onFavourite,
		toolbar
	}: {
		crumbs: Crumb[];
		title: string;
		backHref: string;
		preview?: boolean;
		favourited?: boolean;
		busy?: boolean;
		onFavourite?: () => void;
		toolbar?: Snippet;
	} = $props();
</script>

<div class="header-row">
	<div class="title-block">
		<nav class="crumbs" aria-label="Breadcrumb">
			{#each crumbs as crumb, i}
				{#if i > 0}<span class="muted crumb-sep">/</span>{/if}
				{#if crumb.href}
					<a class="crumb" href={crumb.href}>{crumb.label}</a>
				{:else}
					<span class="crumb">{crumb.label}</span>
				{/if}
			{/each}
		</nav>
		<div class="title-row">
			<div class="desktop-only">
				{#if preview}
					<a class="back-link icon-btn" href={backHref} data-history-back aria-label="Back" title="Back"><Icon name="back" /></a>
				{:else}
					<BackLink fallback={backHref} />
				{/if}
			</div>
			<h1>{title}</h1>
			<FavouriteStar
				{preview}
				{favourited}
				{busy}
				label={title}
				onclick={onFavourite}
			/>
		</div>
	</div>
	{#if toolbar}
		<div class="file-toolbar desktop-only">
			{@render toolbar()}
		</div>
	{/if}
</div>

<style>
	h1 {
		margin: 0;
		font-size: 2rem;
		line-height: 1.2;
		letter-spacing: -0.03em;
		word-break: break-all;
		min-width: 0;
		flex: 0 1 auto;
	}

	.title-block {
		min-width: 0;
		max-width: 100%;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.15rem;
		min-width: 0;
		max-width: 100%;
	}

	.title-row > div {
		display: flex;
		align-items: center;
		align-self: center;
	}

	.crumbs {
		margin: 0 0 0.45rem;
	}

	.crumb {
		background: transparent;
		border: 0;
		padding: 0.2rem 0.35rem;
		color: var(--accent);
		font-weight: 400;
		text-decoration: none;
	}

	.crumb:hover {
		color: var(--accent);
		text-decoration: none;
	}

	.header-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		flex-wrap: wrap;
	}

	@media (max-width: 767px) {
		h1 {
			margin-top: 0;
		}
	}
</style>
