<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	let remoteUrl = $state('');
	let name = $state('');
	let contentRoot = $state('');
	let token = $state('');
	let tokenFromRepoId = $state('');
	let tokenMode = $state<'none' | 'reuse' | 'new'>('none');
	let defaultBranch = $state('main');
	let busy = $state(false);
	let errorMsg = $state('');

	$effect(() => {
		if (data.tokenSources.length > 0 && tokenMode === 'none') {
			tokenMode = 'reuse';
			tokenFromRepoId = data.tokenSources[0].id;
		}
	});

	async function submit(e: Event) {
		e.preventDefault();
		busy = true;
		errorMsg = '';
		try {
			const payload: Record<string, string | undefined> = {
				remoteUrl,
				name: name || undefined,
				contentRoot: contentRoot || undefined,
				defaultBranch: defaultBranch || undefined
			};
			if (tokenMode === 'reuse' && tokenFromRepoId) {
				payload.tokenFromRepoId = tokenFromRepoId;
			} else if (tokenMode === 'new' && token.trim()) {
				payload.token = token.trim();
			}

			const res = await fetch('/api/repos', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
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
	async function pasteRemoteUrl() {
		errorMsg = '';
		try {
			const text = await navigator.clipboard.readText();
			remoteUrl = text.trim();
		} catch {
			errorMsg = 'Could not read clipboard';
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
			<div class="input-with-action">
				<input bind:value={remoteUrl} placeholder="https://github.com/you/notes.git" required />
				<button type="button" onclick={pasteRemoteUrl}>Paste</button>
			</div>
		</label>
		<label>
			Display name <span class="muted">(optional)</span>
			<input bind:value={name} placeholder="My notes" />
		</label>
		<label>
			Content root <span class="muted">(optional, e.g. docs)</span>
			<input bind:value={contentRoot} placeholder="docs" />
		</label>

		<fieldset class="token-field">
			<legend>Personal access token</legend>
			{#if data.tokenSources.length > 0}
				<label class="choice">
					<input type="radio" name="tokenMode" value="reuse" bind:group={tokenMode} />
					Use token from another repo
				</label>
				{#if tokenMode === 'reuse'}
					<label class="nested">
						Repository
						<select bind:value={tokenFromRepoId} required>
							{#each data.tokenSources as source}
								<option value={source.id}>{source.name}</option>
							{/each}
						</select>
					</label>
				{/if}
				<label class="choice">
					<input type="radio" name="tokenMode" value="new" bind:group={tokenMode} />
					Enter a new token
				</label>
				{#if tokenMode === 'new'}
					<label class="nested">
						Token
						<input bind:value={token} type="password" autocomplete="off" placeholder="ghp_…" />
					</label>
				{/if}
				<label class="choice">
					<input type="radio" name="tokenMode" value="none" bind:group={tokenMode} />
					No token (public clone only)
				</label>
			{:else}
				<label>
					Token <span class="muted">(optional for public clone)</span>
					<input bind:value={token} type="password" autocomplete="off" placeholder="ghp_…" />
				</label>
				{#if token.trim()}
					<!-- ensure mode is new when typing without sources -->
				{/if}
			{/if}
		</fieldset>

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

	.token-field {
		margin: 0;
		padding: 0;
		border: 0;
		display: grid;
		gap: 0.55rem;
	}

	.token-field legend {
		padding: 0;
		font-size: 0.9rem;
		color: var(--ink-muted);
		margin-bottom: 0.15rem;
	}

	.choice {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.95rem;
		color: var(--ink);
	}

	.choice input {
		width: auto;
		accent-color: var(--accent);
	}

	.nested {
		margin-left: 1.5rem;
	}

	.input-with-action {
		display: flex;
		gap: 0.5rem;
		align-items: stretch;
	}

	.input-with-action input {
		flex: 1;
		min-width: 0;
	}

	.input-with-action button {
		flex: 0 0 auto;
		white-space: nowrap;
	}
</style>
