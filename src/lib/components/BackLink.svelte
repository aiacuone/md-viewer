<script lang="ts">
	import { goBack } from '$lib/navigation';
	import Icon from '$lib/components/Icon.svelte';

	let { fallback = '/' }: { fallback?: string } = $props();
</script>

<button type="button" class="back-link icon-btn" aria-label="Back" title="Back" onclick={() => goBack(fallback)}>
	<Icon name="back" />
</button>
