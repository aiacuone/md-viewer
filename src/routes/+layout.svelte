<script lang="ts">
	import '../app.css';
	import { afterNavigate } from '$app/navigation';
	import { pwaInfo } from 'virtual:pwa-info';
	import PwaToast from '$lib/components/PwaToast.svelte';

	let { children } = $props();

	let menuOpen = $state(false);

	const webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');

	afterNavigate(() => {
		menuOpen = false;
	});

	function closeMenu() {
		menuOpen = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && menuOpen) closeMenu();
	}
</script>

<svelte:head>
	<title>MD Viewer</title>
	{@html webManifestLink}
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<div class="shell">
	<header class="topbar">
		<a class="brand" href="/">MD Viewer</a>
		<nav class="topbar-nav desktop-only row">
			<a href="/?list=1">Repos</a>
			<a href="/repos/new">Add</a>
			<a href="/settings">Settings</a>
		</nav>
		<button
			type="button"
			class="menu-btn mobile-only"
			aria-label="Open menu"
			aria-expanded={menuOpen}
			aria-controls="mobile-nav"
			onclick={() => (menuOpen = true)}
		>
			<span class="menu-btn-lines" aria-hidden="true"></span>
		</button>
	</header>
	{@render children()}
</div>

{#if menuOpen}
	<div
		class="menu-backdrop"
		role="button"
		tabindex="-1"
		aria-label="Close menu"
		onclick={closeMenu}
		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && closeMenu()}
	></div>
	<nav id="mobile-nav" class="menu-panel card" aria-label="Main">
		<div class="menu-panel-header row">
			<span class="menu-panel-title">Menu</span>
			<button type="button" onclick={closeMenu}>Close</button>
		</div>
		<a href="/?list=1" onclick={closeMenu}>Repos</a>
		<a href="/repos/new" onclick={closeMenu}>Add</a>
		<a href="/settings" onclick={closeMenu}>Settings</a>
	</nav>
{/if}

<PwaToast />

<style>
	.menu-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		flex-shrink: 0;
	}

	.menu-btn-lines,
	.menu-btn-lines::before,
	.menu-btn-lines::after {
		display: block;
		width: 1.1rem;
		height: 2px;
		background: currentColor;
		border-radius: 1px;
	}

	.menu-btn-lines {
		position: relative;
	}

	.menu-btn-lines::before,
	.menu-btn-lines::after {
		content: '';
		position: absolute;
		left: 0;
	}

	.menu-btn-lines::before {
		top: -5px;
	}

	.menu-btn-lines::after {
		top: 5px;
	}

	.menu-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		z-index: 60;
	}

	.menu-panel {
		position: fixed;
		top: 0.75rem;
		right: 0.75rem;
		left: 0.75rem;
		z-index: 61;
		display: grid;
		gap: 0.25rem;
		padding: 0.85rem 1rem 1rem;
		max-width: 28rem;
		margin-left: auto;
	}

	.menu-panel-header {
		justify-content: space-between;
		margin-bottom: 0.35rem;
	}

	.menu-panel-title {
		font-weight: 600;
	}

	.menu-panel a {
		display: block;
		padding: 0.75rem 0.35rem;
		color: var(--ink);
		text-decoration: none;
		border-top: 1px solid var(--border);
		font-size: 1.05rem;
	}

	.menu-panel a:first-of-type {
		border-top: 0;
	}

	.menu-panel a:hover {
		color: var(--accent);
		text-decoration: none;
	}
</style>
