<script lang="ts">
	import BackLink from './BackLink.svelte';
	import Icon from './Icon.svelte';

	type Crumb = { label: string; href?: string };

	let {
		title,
		crumbs,
		backHref,
		branch,
		status,
		contentRoot = '',
		preview = false,
		onCrumb,
		onBack,
		onConvert,
		onPull,
		onPush,
		onSync
	}: {
		title: string;
		crumbs: Crumb[];
		backHref: string;
		branch: string;
		status: string;
		contentRoot?: string;
		preview?: boolean;
		onCrumb?: (index: number) => void;
		onBack?: () => void;
		onConvert?: () => void;
		onPull?: () => void;
		onPush?: () => void;
		onSync?: () => void;
	} = $props();

	const aiLabel = $derived(preview ? 'AI' : 'Convert');
</script>

{#snippet crumbTrail()}
	{#each crumbs as crumb, i}
		{#if i > 0}<span class="muted crumb-sep">/</span>{/if}
		{#if preview}
			{#if crumb.href}
				<a class="crumb" href={crumb.href}>{crumb.label}</a>
			{:else}
				<span class="crumb">{crumb.label}</span>
			{/if}
		{:else}
			<button type="button" class="crumb" onclick={() => onCrumb?.(i)}>{crumb.label}</button>
		{/if}
	{/each}
{/snippet}

<div class="header-row">
	<div class="title-block">
		<nav class="crumbs" aria-label="Breadcrumb">
			{@render crumbTrail()}
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
		</div>
		{#if contentRoot}
			<p class="muted">content root <code>{contentRoot}</code></p>
		{/if}
	</div>
	<div class="file-toolbar desktop-only">
		<p class="sync-status">
			<strong>{branch}</strong>
			<span>{status}</span>
		</p>
		<div class="tool-group">
			<button
				type="button"
				class="icon-btn"
				data-preview-disabled={preview ? '' : undefined}
				aria-label={aiLabel}
				title={aiLabel}
				onclick={preview ? undefined : onConvert}
			><Icon name="convert" /></button>
			<button
				type="button"
				class="icon-btn"
				data-preview-disabled={preview ? '' : undefined}
				aria-label="Pull"
				title="Pull"
				onclick={preview ? undefined : onPull}
			><Icon name="pull" /></button>
			<button
				type="button"
				class="icon-btn"
				data-preview-disabled={preview ? '' : undefined}
				aria-label="Push"
				title="Push"
				onclick={preview ? undefined : onPush}
			><Icon name="push" /></button>
		</div>
	</div>
</div>

<nav class="action-bar mobile-only" aria-label="Browse actions">
	{#if preview}
		<a class="icon-btn" href={backHref} data-history-back aria-label="Back" title="Back"><Icon name="back" /></a>
	{:else}
		<button type="button" class="icon-btn" onclick={onBack} aria-label="Back" title="Back">
			<Icon name="back" />
		</button>
	{/if}
	<div class="action-crumbs" aria-label="Breadcrumb">
		{@render crumbTrail()}
	</div>
	<button
		type="button"
		class="primary icon-btn"
		data-preview-disabled={preview ? '' : undefined}
		aria-label={aiLabel}
		title={aiLabel}
		onclick={preview ? undefined : onConvert}
	><Icon name="convert" /></button>
	<button
		type="button"
		class="icon-btn"
		data-preview-disabled={preview ? '' : undefined}
		aria-label="Sync"
		title="Sync"
		onclick={preview ? undefined : onSync}
	><Icon name="sync" /></button>
</nav>

<style>
	h1 {
		margin: 0;
		font-size: 2rem;
		line-height: 1.2;
		letter-spacing: -0.03em;
		min-width: 0;
	}

	.title-row,
	.header-row,
	.action-bar,
	.action-crumbs {
		display: flex;
		align-items: center;
	}

	.title-row {
		gap: 0.35rem;
		min-width: 0;
	}

	.title-row > div {
		display: flex;
		align-items: center;
		align-self: center;
	}

	.header-row {
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		flex-wrap: wrap;
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
		gap: 0.35rem;
		padding: 0.55rem 0.65rem calc(0.55rem + env(safe-area-inset-bottom));
		background: color-mix(in srgb, var(--bg-elevated) 92%, transparent);
		border-top: 1px solid var(--border);
		backdrop-filter: blur(10px);
		box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
	}

	.action-crumbs {
		flex: 1 1 auto;
		min-width: 0;
		overflow-x: auto;
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
</style>
