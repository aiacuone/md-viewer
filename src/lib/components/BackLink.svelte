<script lang="ts">
	import { goBack } from '$lib/navigation';

	let { fallback = '/' }: { fallback?: string } = $props();
</script>

<button type="button" class="back-link" onclick={() => goBack(fallback)}>
	<svg viewBox="0 0 14 14" aria-hidden="true">
		<path
			d="M8.75 2.25 3.5 7l5.25 4.75"
			fill="none"
			stroke="currentColor"
			stroke-width="1.75"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
	Back
</button>
