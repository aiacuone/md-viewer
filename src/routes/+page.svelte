<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import type { RepoPublic } from '$lib/types';

	let { data } = $props();
	let busyId = $state<string | null>(null);
	let defaultBusy = $state(false);
	let errorMsg = $state('');
	let defaultRepoId = $state<string | null>(null);
	let detailsRepo = $state<RepoPublic | null>(null);

	$effect(() => {
		defaultRepoId = data.defaultRepoId;
	});

	function openDetails(repo: RepoPublic) {
		detailsRepo = repo;
	}

	function closeDetails() {
		detailsRepo = null;
	}

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
			detailsRepo = null;
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
					</button>
					<button
						type="button"
						class="details-btn"
						onclick={() => openDetails(repo)}
						aria-label={`Details for ${repo.name}`}
						title="Details"
					>
						<span aria-hidden="true">⋮</span>
					</button>
				</article>
			{/each}
		</div>
	{/if}
</section>

{#if detailsRepo}
	<div
		class="backdrop"
		role="button"
		tabindex="0"
		onclick={closeDetails}
		onkeydown={(e) => (e.key === 'Escape' || e.key === 'Enter') && closeDetails()}
	>
		<div
			class="dialog card stack"
			role="dialog"
			aria-modal="true"
			aria-labelledby="repo-details-title"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="dialog-head">
				<h2 id="repo-details-title">{detailsRepo.name}</h2>
				<button type="button" class="close" onclick={closeDetails}>Close</button>
			</div>
			<div class="meta">
				<p class="muted label">Remote URL</p>
				<p class="url">{detailsRepo.remoteUrl}</p>
				{#if detailsRepo.contentRoot}
					<p class="muted label">Content root</p>
					<p><code>{detailsRepo.contentRoot}</code></p>
				{/if}
			</div>
			<div class="row dialog-actions">
				<button
					type="button"
					disabled={defaultBusy || defaultRepoId === detailsRepo.id}
					onclick={() => setDefault(detailsRepo!.id)}
				>
					{defaultRepoId === detailsRepo.id ? 'Default' : 'Set default'}
				</button>
				<button
					class="danger compact"
					type="button"
					disabled={busyId === detailsRepo.id}
					onclick={() => removeRepo(detailsRepo!.id, detailsRepo!.name)}
				>
					{busyId === detailsRepo.id ? 'Removing…' : 'Remove'}
				</button>
			</div>
		</div>
	</div>
{/if}

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
		min-width: 0;
	}

	.repo-main strong {
		font-size: 1.05rem;
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}

	.details-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		font-size: 1.25rem;
		line-height: 1;
		letter-spacing: 0;
		color: var(--ink-muted);
	}

	.details-btn:hover {
		color: var(--ink);
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

	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		display: grid;
		place-items: center;
		padding: 1rem;
		z-index: 50;
	}

	.dialog {
		width: min(440px, 100%);
	}

	.dialog-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.dialog-head h2 {
		margin: 0;
		font-size: 1.2rem;
	}

	.close {
		padding: 0.35rem 0.65rem;
		font-size: 0.85rem;
	}

	.meta {
		display: grid;
		gap: 0.35rem;
	}

	.meta .label {
		margin: 0.5rem 0 0;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.meta .label:first-child {
		margin-top: 0;
	}

	.url {
		margin: 0;
		word-break: break-all;
		font-family: var(--font-mono);
		font-size: 0.9rem;
	}

	.dialog-actions {
		justify-content: flex-end;
	}

	.dialog-actions .compact {
		padding: 0.3rem 0.6rem;
		font-size: 0.8rem;
	}

	@media (max-width: 640px) {
		.repo {
			grid-template-columns: 1fr auto;
		}
	}
</style>
