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
		<a class="brand" href={homeHref}>MD Viewer</a>
		<nav class="topbar-nav row" aria-label="Main">
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
				<a class="signin" href="/login">Sign in</a>
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
						<button type="submit" class="signout" title="Sign out">Sign out</button>
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
		gap: 0.4rem;
		flex-wrap: nowrap;
	}

	.signin,
	.signout {
		display: inline-flex;
		align-items: center;
		padding: 0.4rem 0.75rem;
		border-radius: 8px;
		background: var(--accent);
		color: var(--accent-ink);
		font-weight: 600;
		font-size: 0.9rem;
		text-decoration: none;
		border: 0;
	}

	.signin:hover {
		text-decoration: none;
	}

	.signout {
		background: var(--bg-soft);
		color: var(--ink);
		border: 1px solid var(--border);
		font-weight: 500;
	}
</style>
