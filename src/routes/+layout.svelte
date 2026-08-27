<script lang="ts">
	import '../app.css';
	import { pwaInfo } from 'virtual:pwa-info';
	import PwaToast from '$lib/components/PwaToast.svelte';

	let { children } = $props();

	const webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');
</script>

<svelte:head>
	<title>MD Viewer</title>
	{@html webManifestLink}
</svelte:head>

<div class="shell">
	<header class="topbar">
		<a class="brand" href="/">MD Viewer</a>
		<nav class="row">
			<a href="/repos/new">Add repo</a>
			<a href="/settings">Settings</a>
		</nav>
	</header>
	{@render children()}
</div>

<PwaToast />
