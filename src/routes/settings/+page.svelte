<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	let authorName = $state('');
	let authorEmail = $state('');
	let busy = $state(false);
	let saved = $state(false);
	let errorMsg = $state('');

	onMount(async () => {
		const res = await fetch('/api/settings');
		const body = await res.json();
		authorName = body.authorName ?? '';
		authorEmail = body.authorEmail ?? '';
	});

	function goBack() {
		if (browser && window.history.length > 1) {
			history.back();
		} else {
			goto('/');
		}
	}

	async function submit(e: Event) {
		e.preventDefault();
		busy = true;
		saved = false;
		errorMsg = '';
		try {
			const res = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ authorName, authorEmail })
			});
			const body = await res.json();
			if (!res.ok) throw new Error(body.message || 'Failed to save settings');
			authorName = body.authorName;
			authorEmail = body.authorEmail;
			saved = true;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to save settings';
		} finally {
			busy = false;
		}
	}
</script>

<section class="stack" style="max-width: 520px">
	<div>
		<button type="button" class="back muted" onclick={goBack}>← Back</button>
		<h1>Settings</h1>
		<p class="muted">Used as the git author for commits.</p>
	</div>

	<form class="card stack" onsubmit={submit}>
		<label>
			Author name
			<input bind:value={authorName} required />
		</label>
		<label>
			Author email
			<input bind:value={authorEmail} type="email" required />
		</label>
		{#if errorMsg}
			<p class="error">{errorMsg}</p>
		{/if}
		{#if saved}
			<p class="muted">Saved.</p>
		{/if}
		<button class="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
	</form>
</section>

<style>
	.back {
		display: inline-block;
		margin-bottom: 0.35rem;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font: inherit;
		text-align: left;
	}

	.back:hover {
		text-decoration: underline;
	}

	h1 {
		margin: 0 0 0.35rem;
	}
</style>
