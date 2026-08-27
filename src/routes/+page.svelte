<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';

	let { data } = $props();
	let busyId = $state<string | null>(null);
	let defaultBusy = $state(false);
	let errorMsg = $state('');
	let defaultRepoId = $state<string | null>(null);

	$effect(() => {
		defaultRepoId = data.defaultRepoId;
	});

	async function removeRepo(id: string, name: string) {
		const ok = confirm(
			`Remove “${name}”?\n\nThis deletes the local clone and app metadata only. The remote repository is not deleted. Uncommitted local edits will be lost.`
		);
		if (!ok) return;
		busyId = id;
		errorMsg = '';
		try {
			const res = await fetch(`/api/repos/${id}`, { method: 'DELETE' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.message || 'Failed to remove repo');
			}
			await invalidateAll();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to remove repo';
		} finally {
			busyId = null;
		}
	}

	async function setDefault(id: string | null) {
		defaultBusy = true;
		errorMsg = '';
		try {
			const current = await fetch('/api/settings').then((r) => r.json());
			const res = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					authorName: current.authorName,
					authorEmail: current.authorEmail,
					defaultRepoId: id
				})
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.message || 'Failed to save default repo');
			defaultRepoId = body.defaultRepoId ?? null;
			await invalidateAll();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to save default repo';
		} finally {
			defaultBusy = false;
		}
	}
</script>

<section class="stack">
	<div>
		<h1>Repositories</h1>
		<p class="muted">
			Home opens your default repo automatically. With one repo, that happens by itself.
		</p>
	</div>

	{#if errorMsg}
		<p class="error">{errorMsg}</p>
	{/if}

	{#if data.repos.length === 0}
		<div class="card stack">
			<p class="muted">No repositories yet.</p>
			<div class="row">
				<a class="button-link" href="/repos/new"
					><button class="primary" type="button">Add repository</button></a
				>
			</div>
		</div>
	{:else}
		{#if data.repos.length > 1}
			<div class="card stack default-picker">
				<label>
					Default repository
					<select
						value={defaultRepoId ?? ''}
						disabled={defaultBusy}
						onchange={(e) => {
							const v = (e.currentTarget as HTMLSelectElement).value;
							void setDefault(v || null);
						}}
					>
						<option value="">None — always show this list</option>
						{#each data.repos as repo}
							<option value={repo.id}>{repo.name}</option>
						{/each}
					</select>
				</label>
				<p class="muted hint">Opening MD Viewer goes straight to the default repo.</p>
			</div>
		{/if}

		<div class="repo-list">
			{#each data.repos as repo}
				<article class="card repo">
					<button class="repo-main" type="button" onclick={() => goto(`/repos/${repo.id}`)}>
						<strong>
							{repo.name}
							{#if defaultRepoId === repo.id}
								<span class="tag">default</span>
							{/if}
						</strong>
						<span class="muted">{repo.remoteUrl}</span>
						{#if repo.contentRoot}
							<span class="tag">root: {repo.contentRoot}</span>
						{/if}
					</button>
					<div class="actions">
						{#if data.repos.length > 1 && defaultRepoId !== repo.id}
							<button
								type="button"
								disabled={defaultBusy}
								onclick={() => setDefault(repo.id)}
							>
								Set default
							</button>
						{/if}
						<button
							class="danger"
							type="button"
							disabled={busyId === repo.id}
							onclick={() => removeRepo(repo.id, repo.name)}
						>
							{busyId === repo.id ? 'Removing…' : 'Remove'}
						</button>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</section>

<style>
	h1 {
		margin: 0 0 0.35rem;
		font-size: 1.8rem;
		letter-spacing: -0.03em;
	}

	.default-picker .hint {
		margin: 0;
		font-size: 0.85rem;
	}

	.repo-list {
		display: grid;
		gap: 0.75rem;
	}

	.repo {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.75rem;
		align-items: center;
	}

	.repo-main {
		display: grid;
		gap: 0.25rem;
		text-align: left;
		background: transparent;
		border: 0;
		padding: 0;
		color: inherit;
		min-width: 0;
	}

	.repo-main strong {
		font-size: 1.05rem;
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.tag {
		display: inline-block;
		width: fit-content;
		font-size: 0.8rem;
		padding: 0.15rem 0.45rem;
		border-radius: 999px;
		border: 1px solid var(--border);
		color: var(--ink-muted);
		font-weight: 500;
	}

	.button-link {
		text-decoration: none;
	}

	@media (max-width: 640px) {
		.repo {
			grid-template-columns: 1fr;
		}

		.actions {
			justify-content: flex-start;
		}
	}
</style>
