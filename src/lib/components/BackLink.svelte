<script lang="ts">
	let {
		href,
		label
	}: {
		href: string;
		label: string;
	} = $props();
</script>

<a class="back-link" {href}>
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
	{label}
</a>
