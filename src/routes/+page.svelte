<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';

	let { data } = $props();
	let busyId = $state<string | null>(null);
	let errorMsg = $state('');

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
</script>

<section class="stack">
	<div>
		<h1>Repositories</h1>
		<p class="muted">Clone a markdown git repo, browse folders, edit, then commit and push.</p>
	</div>

	{#if errorMsg}
		<p class="error">{errorMsg}</p>
	{/if}

	{#if data.repos.length === 0}
		<div class="card stack">
			<p class="muted">No repositories yet.</p>
			<div class="row">
				<a class="button-link" href="/repos/new"><button class="primary" type="button">Add repository</button></a>
			</div>
		</div>
	{:else}
		<div class="repo-list">
			{#each data.repos as repo}
				<article class="card repo">
					<button class="repo-main" type="button" onclick={() => goto(`/repos/${repo.id}`)}>
						<strong>{repo.name}</strong>
						<span class="muted">{repo.remoteUrl}</span>
						{#if repo.contentRoot}
							<span class="tag">root: {repo.contentRoot}</span>
						{/if}
					</button>
					<button
						class="danger"
						type="button"
						disabled={busyId === repo.id}
						onclick={() => removeRepo(repo.id, repo.name)}
					>
						{busyId === repo.id ? 'Removing…' : 'Remove'}
					</button>
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
	}

	.repo-main strong {
		font-size: 1.05rem;
	}

	.tag {
		display: inline-block;
		width: fit-content;
		font-size: 0.8rem;
		padding: 0.15rem 0.45rem;
		border-radius: 999px;
		border: 1px solid var(--border);
		color: var(--ink-muted);
	}

	.button-link {
		text-decoration: none;
	}
</style>
