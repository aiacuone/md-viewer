<script lang="ts">
	import '../app.css';
	import Icon from '$lib/components/Icon.svelte';
	import { page } from '$app/state';
	import { pwaInfo } from 'virtual:pwa-info';
	import PwaToast from '$lib/components/PwaToast.svelte';

	let { children, data } = $props();

	const webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');
	const path = $derived(page.url.pathname);
	const homeHref = $derived(data.preview ? '/preview' : '/');
	const reposActive = $derived(
		data.preview ? !path.startsWith('/preview/') : path === '/' && page.url.searchParams.get('list') === '1'
	);
	const addActive = $derived(path === '/repos/new');
	const settingsActive = $derived(path === '/settings');
</script>

<svelte:head>
	<title>MD Viewer</title>
	{@html webManifestLink}
</svelte:head>

<div class="shell">
	<header class="topbar">
		<a class="brand" href={homeHref}><span class="brand-mark">M</span><span>MD Viewer</span></a>
		<nav class="topbar-nav" aria-label="Main">
			<a
				class="icon-btn"
				class:active={reposActive}
				href={data.preview ? '/preview' : '/?list=1'}
				aria-label="Repos"
				aria-current={reposActive ? 'page' : undefined}
				title="Repos"
			>
				<Icon name="repos" />
			</a>
			{#if data.preview}
				<button type="button" class="icon-btn" data-preview-disabled aria-label="Add" title="Add">
					<Icon name="plus" />
				</button>
				<button type="button" class="icon-btn" data-preview-disabled aria-label="Settings" title="Settings">
					<Icon name="settings" />
				</button>
				<a class="icon-btn" href="/login" aria-label="Sign in" title="Sign in">
					<Icon name="login" />
				</a>
			{:else}
				<a
					class="icon-btn"
					class:active={addActive}
					href="/repos/new"
					aria-label="Add"
					aria-current={addActive ? 'page' : undefined}
					title="Add"
				>
					<Icon name="plus" />
				</a>
				<a
					class="icon-btn"
					class:active={settingsActive}
					href="/settings"
					aria-label="Settings"
					aria-current={settingsActive ? 'page' : undefined}
					title="Settings"
				>
					<Icon name="settings" />
				</a>
				{#if data.user}
					<form method="POST" action="/logout">
						<button type="submit" class="icon-btn" aria-label="Sign out" title="Sign out">
							<Icon name="logout" />
						</button>
					</form>
				{/if}
			{/if}
		</nav>
	</header>
	{@render children()}
</div>

<PwaToast />

<style>
	.topbar-nav {
		display: flex;
		align-items: center;
		gap: 0;
		flex-wrap: nowrap;
		padding: 0.2rem;
		background: var(--bg-soft);
		border: 1px solid var(--border);
		border-radius: 12px;
	}

	.topbar-nav form {
		display: flex;
		margin: 0;
	}

	.topbar-nav :global(.icon-btn) {
		background: transparent;
		border: 0;
		border-radius: 8px;
	}

	.topbar-nav :global(.icon-btn.active) {
		background: var(--bg);
		color: var(--accent);
	}
</style>
