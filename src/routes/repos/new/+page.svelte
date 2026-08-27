<script lang="ts">
	import { goto } from '$app/navigation';

	let remoteUrl = $state('');
	let name = $state('');
	let contentRoot = $state('');
	let token = $state('');
	let defaultBranch = $state('main');
	let busy = $state(false);
	let errorMsg = $state('');

	async function submit(e: Event) {
		e.preventDefault();
		busy = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/repos', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					remoteUrl,
					name: name || undefined,
					contentRoot: contentRoot || undefined,
					token: token || undefined,
					defaultBranch: defaultBranch || undefined
				})
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(body.message || 'Failed to add repository');
			}
			await goto(`/repos/${body.id}`);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to add repository';
		} finally {
			busy = false;
		}
	}
</script>

<section class="stack" style="max-width: 560px">
	<div>
		<h1>Add repository</h1>
		<p class="muted">Paste an HTTPS remote URL. Add a PAT for private repos and for push.</p>
	</div>

	<form class="card stack" onsubmit={submit}>
		<label>
			Remote URL
			<input bind:value={remoteUrl} placeholder="https://github.com/you/notes.git" required />
		</label>
		<label>
			Display name <span class="muted">(optional)</span>
			<input bind:value={name} placeholder="My notes" />
		</label>
		<label>
			Content root <span class="muted">(optional, e.g. docs)</span>
			<input bind:value={contentRoot} placeholder="docs" />
		</label>
		<label>
			Personal access token <span class="muted">(optional for public clone)</span>
			<input bind:value={token} type="password" autocomplete="off" placeholder="ghp_…" />
		</label>
		<label>
			Default branch
			<input bind:value={defaultBranch} placeholder="main" />
		</label>

		{#if errorMsg}
			<p class="error">{errorMsg}</p>
		{/if}

		<div class="row">
			<button class="primary" type="submit" disabled={busy}>
				{busy ? 'Cloning…' : 'Clone repository'}
			</button>
			<a href="/">Cancel</a>
		</div>
	</form>
</section>

<style>
	h1 {
		margin: 0 0 0.35rem;
		letter-spacing: -0.03em;
	}
</style>
