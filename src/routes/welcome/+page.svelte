<script lang="ts">
	let { data } = $props();
</script>

<section class="welcome">
	<div class="card hero">
		<p class="eyebrow">Markdown, backed by git</p>
		<h1>Your notes stay yours.</h1>
		<p class="intro">{data.aboutText}</p>
		<nav class="topics" aria-label="About the app">
			<a href="/preview/app/overview?from=/welcome" data-sveltekit-reload>What it is</a>
			<a href="/preview/app/features/AI?from=/welcome" data-sveltekit-reload>AI</a>
			<a href="/preview/app/build/stack?from=/welcome" data-sveltekit-reload>Stack</a>
			<a href="/preview/app/features/browse-and-edit?from=/welcome" data-sveltekit-reload>Editing</a>
			<a href="/preview/app/features/sync?from=/welcome" data-sveltekit-reload>Sync</a>
		</nav>

		{#if data.denied}
			<p class="error">This Google account is not allowed to access this server.</p>
		{/if}

		<div class="actions">
			{#if data.configured}
				<a class="primary" href="/login/google">Sign in with Google</a>
			{:else}
				<a class="primary" href="/login">Sign in</a>
			{/if}
			<a href="/preview">Browse sample notes</a>
		</div>
	</div>
</section>

<style>
	.welcome {
		display: grid;
		place-items: center;
		min-height: min(65vh, 42rem);
	}

	.hero {
		width: min(100%, 44rem);
		padding: clamp(1.5rem, 5vw, 3.5rem);
	}

	.eyebrow {
		margin: 0 0 0.6rem;
		color: var(--accent);
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		font-size: clamp(2rem, 7vw, 3.5rem);
		letter-spacing: -0.05em;
		line-height: 1;
	}

	.intro {
		max-width: 38rem;
		margin: 1rem 0 0;
		color: var(--ink-muted);
		font-size: 1.05rem;
		line-height: 1.6;
	}

	.topics {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1rem;
		margin-top: 1rem;
	}

	.topics a {
		color: var(--accent);
		font-weight: 600;
		text-decoration: none;
	}

	.topics a:hover {
		text-decoration: underline;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.75rem 1rem;
		flex-wrap: wrap;
		margin-top: 1.5rem;
	}

	.actions a {
		display: inline-flex;
		align-items: center;
		min-height: 2.5rem;
		padding: 0.55rem 0.9rem;
		border-radius: 8px;
		font-weight: 600;
		text-decoration: none;
	}

	.actions a:not(.primary) {
		border: 1px solid var(--border);
		color: inherit;
	}

	.actions .primary {
		background: var(--accent);
		color: var(--accent-ink);
	}
</style>
