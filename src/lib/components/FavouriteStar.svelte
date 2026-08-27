<script lang="ts">
	let {
		favourited = false,
		busy = false,
		label = 'Favourite',
		onclick
	}: {
		favourited?: boolean;
		busy?: boolean;
		label?: string;
		onclick: () => void;
	} = $props();
</script>

<button
	type="button"
	class="star"
	class:on={favourited}
	disabled={busy}
	aria-pressed={favourited}
	aria-label={favourited ? `Unpin ${label}` : `Pin ${label}`}
	title={favourited ? 'Unpin' : 'Pin'}
	{onclick}
>
	<svg viewBox="0 0 24 24" aria-hidden="true">
		{#if favourited}
			<path
				fill="currentColor"
				d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.47L12 17.77l-5.8 3.05 1.11-6.47-4.7-4.58 6.49-.94L12 2.5z"
			/>
		{:else}
			<path
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linejoin="round"
				d="M12 3.2l2.55 5.17 5.7.83-4.12 4.02.97 5.67L12 16.2l-5.1 2.69.97-5.67-4.12-4.02 5.7-.83L12 3.2z"
			/>
		{/if}
	</svg>
</button>

<style>
	.star {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--ink-muted);
		border-radius: 8px;
	}

	.star:hover:not(:disabled) {
		color: var(--ink);
	}

	.star.on {
		color: var(--accent);
	}

	.star:disabled {
		opacity: 0.55;
	}

	.star svg {
		width: 1.15rem;
		height: 1.15rem;
	}
</style>
