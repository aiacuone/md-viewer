<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { goBack } from '$lib/navigation';

	let { data } = $props();

	let authorName = $state('');
	let authorEmail = $state('');
	let token = $state('');
	let hasToken = $state(false);
	let busy = $state(false);
	let tokenBusy = $state(false);
	let saved = $state(false);
	let tokenSaved = $state(false);
	let errorMsg = $state('');
	let tokenError = $state('');

	$effect(() => {
		authorName = data.settings.authorName ?? '';
		authorEmail = data.settings.authorEmail ?? '';
		hasToken = data.settings.hasToken ?? false;
	});

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
			hasToken = body.hasToken;
			saved = true;
			await invalidateAll();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to save settings';
		} finally {
			busy = false;
		}
	}

	async function saveToken(e: Event) {
		e.preventDefault();
		if (!token.trim()) {
			tokenError = 'Enter a token to save';
			return;
		}
		tokenBusy = true;
		tokenSaved = false;
		tokenError = '';
		try {
			const res = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					authorName,
					authorEmail,
					defaultRepoId: data.settings.defaultRepoId ?? null,
					token: token.trim()
				})
			});
			const body = await res.json();
			if (!res.ok) throw new Error(body.message || 'Failed to save token');
			hasToken = body.hasToken;
			token = '';
			tokenSaved = true;
			await invalidateAll();
		} catch (err) {
			tokenError = err instanceof Error ? err.message : 'Failed to save token';
		} finally {
			tokenBusy = false;
		}
	}

	async function clearToken() {
		const ok = confirm('Remove the personal access token? Push and private clones will fail until you add a new one.');
		if (!ok) return;
		tokenBusy = true;
		tokenSaved = false;
		tokenError = '';
		try {
			const res = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					authorName,
					authorEmail,
					defaultRepoId: data.settings.defaultRepoId ?? null,
					clearToken: true
				})
			});
			const body = await res.json();
			if (!res.ok) throw new Error(body.message || 'Failed to clear token');
			hasToken = body.hasToken;
			token = '';
			tokenSaved = true;
			await invalidateAll();
		} catch (err) {
			tokenError = err instanceof Error ? err.message : 'Failed to clear token';
		} finally {
			tokenBusy = false;
		}
	}
</script>

<section class="stack" style="max-width: 520px">
	<div>
		<button type="button" class="back-link" onclick={() => goBack()}>
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
		<p class="muted">Git author and access token used for all repositories.</p>
	</div>

	<form class="card stack" onsubmit={submit}>
		<h2>Commit author</h2>
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

	<form class="card stack" onsubmit={saveToken}>
		<h2>Personal access token</h2>
		<p class="muted">
			One token for all remotes (clone, pull, push).
			{#if hasToken}
				<span class="status set">Token set</span>
			{:else}
				<span class="status missing">No token</span>
			{/if}
		</p>
		<label>
			{hasToken ? 'Replace token' : 'Token'}
			<input bind:value={token} type="password" autocomplete="off" placeholder="ghp_…" />
		</label>
		{#if tokenError}
			<p class="error">{tokenError}</p>
		{/if}
		{#if tokenSaved}
			<p class="muted">Token updated.</p>
		{/if}
		<div class="row">
			<button class="primary" type="submit" disabled={tokenBusy}>
				{tokenBusy ? 'Saving…' : hasToken ? 'Replace token' : 'Save token'}
			</button>
			{#if hasToken}
				<button type="button" disabled={tokenBusy} onclick={clearToken}>Clear</button>
			{/if}
		</div>
	</form>
</section>

<style>
	.back-link {
		margin-bottom: 0.35rem;
	}

	h1 {
		margin: 0 0 0.35rem;
	}

	h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.status {
		display: inline-block;
		margin-left: 0.35rem;
		font-size: 0.85rem;
	}

	.status.set {
		color: var(--ok, #2a7a4b);
	}

	.status.missing {
		color: var(--ink-muted);
	}
</style>
