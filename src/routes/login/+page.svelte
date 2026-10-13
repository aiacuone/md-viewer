<script lang="ts">
	let { data } = $props();
</script>

<section class="stack login">
	<div class="card">
		<h1>Sign in</h1>
		<p class="muted">Use a Google account that is on the allow list for this server.</p>
		{#if data.errorMessage}
			<p class="error">{data.errorMessage}</p>
		{/if}
		{#if data.configured}
			<a class="google" href="/login/google">Sign in with Google</a>
		{:else}
			<p class="error">Google sign-in is not configured on this server.</p>
		{/if}
	</div>
</section>

<style>
	h1 {
		margin: 0 0 0.35rem;
		font-size: 1.35rem;
	}

	.login {
		max-width: 28rem;
	}

	.google {
		display: inline-flex;
		margin-top: 0.5rem;
		padding: 0.55rem 0.9rem;
		border-radius: 8px;
		background: var(--accent);
		color: var(--accent-ink);
		font-weight: 600;
		text-decoration: none;
	}

	.google:hover {
		text-decoration: none;
	}
</style>
