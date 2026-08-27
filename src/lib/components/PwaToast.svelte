<script lang="ts">
	import { onMount } from 'svelte';

	let needRefresh = $state(false);
	let offlineReady = $state(false);
	let updateSW: ((reload?: boolean) => Promise<void>) | undefined;

	onMount(async () => {
		const { registerSW } = await import('virtual:pwa-register');
		updateSW = registerSW({
			immediate: true,
			onNeedRefresh() {
				needRefresh = true;
			},
			onOfflineReady() {
				offlineReady = true;
				setTimeout(() => {
					offlineReady = false;
				}, 2500);
			}
		});
	});
</script>

{#if needRefresh || offlineReady}
	<div class="toast card">
		{#if needRefresh}
			<span>Update available.</span>
			<button
				class="primary"
				type="button"
				onclick={() => {
					updateSW?.(true);
					needRefresh = false;
				}}>Reload</button
			>
		{:else}
			<span>Ready to work offline (UI shell).</span>
		{/if}
	</div>
{/if}

<style>
	.toast {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: 80;
		display: flex;
		gap: 0.75rem;
		align-items: center;
		box-shadow: var(--shadow);
	}
</style>
