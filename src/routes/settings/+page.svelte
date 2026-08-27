<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { browser } from '$app/environment';

	let { data } = $props();

	let authorName = $state('');
	let authorEmail = $state('');
	let busy = $state(false);
	let saved = $state(false);
	let errorMsg = $state('');

	$effect(() => {
		authorName = data.settings.authorName ?? '';
		authorEmail = data.settings.authorEmail ?? '';
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
				body: JSON.stringify({
					authorName,
					authorEmail,
					defaultRepoId: data.settings.defaultRepoId ?? null
				})
			});
			const body = await res.json();
			if (!res.ok) throw new Error(body.message || 'Failed to save settings');
			authorName = body.authorName;
			authorEmail = body.authorEmail;
			saved = true;
			await invalidateAll();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to save settings';
		} finally {
			busy = false;
		}
	}
</script>

<section class="stack" style="max-width: 520px">
	<div>
		<button type="button" class="back-link" onclick={goBack}>
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
		<h1>Settings</h1>
		<p class="muted">Git author used for commits.</p>
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
	.back-link {
		margin-bottom: 0.35rem;
	}

	h1 {
		margin: 0 0 0.35rem;
	}
</style>
