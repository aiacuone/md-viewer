<script lang="ts">
	import type { DiffFile } from '$lib/types';
	import DiffView from '$lib/components/DiffView.svelte';
	import { displayName } from '$lib/display';
	import { statusLabel, suggestCommitMessage } from '$lib/diff';

	let {
		repoId,
		open = $bindable(false),
		onCommitted
	}: {
		repoId: string;
		open?: boolean;
		onCommitted: () => void | Promise<void>;
	} = $props();

	let diffs = $state<DiffFile[]>([]);
	let selected = $state<string | null>(null);
	let message = $state('');
	let messageEdited = $state(false);
	let loading = $state(false);
	let committing = $state(false);
	let errorMsg = $state('');

	const active = $derived(diffs.find((d) => d.path === selected) ?? diffs[0] ?? null);

	$effect(() => {
		if (open) {
			message = '';
			messageEdited = false;
			void loadDiffs();
		}
	});

	function applySuggestion() {
		message = suggestCommitMessage(diffs);
		messageEdited = false;
	}

	async function loadDiffs() {
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/repos/${repoId}/diff`);
			const body = await res.json();
			if (!res.ok) throw new Error(body.message || 'Failed to load diffs');
			diffs = body;
			selected = body[0]?.path ?? null;
			if (!messageEdited) {
				message = suggestCommitMessage(body);
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load diffs';
		} finally {
			loading = false;
		}
	}

	async function commit() {
		if (!message.trim()) {
			errorMsg = 'Commit message is required';
			return;
		}
		committing = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/repos/${repoId}/commit`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ message })
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.message || 'Commit failed');
			message = '';
			open = false;
			await onCommitted();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Commit failed';
		} finally {
			committing = false;
		}
	}

	function close() {
		open = false;
	}
</script>

{#if open}
	<div
		class="backdrop"
		role="button"
		tabindex="0"
		onclick={close}
		onkeydown={(e) => (e.key === 'Escape' || e.key === 'Enter') && close()}
	>
		<div
			class="dialog card"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="row" style="justify-content: space-between">
				<h2>Commit changes</h2>
				<button type="button" onclick={close}>Close</button>
			</div>

			{#if loading}
				<p class="muted">Loading diffs…</p>
			{:else if diffs.length === 0}
				<p class="muted">No uncommitted changes.</p>
			{:else}
				<div class="diff-layout">
					<ul>
						{#each diffs as d}
							<li>
								<button
									type="button"
									class:active={active?.path === d.path}
									onclick={() => (selected = d.path)}
								>
									<span class="st">{statusLabel(d.status)}</span>
									{displayName(d.path.split('/').pop() ?? d.path)}
								</button>
							</li>
						{/each}
					</ul>
					<DiffView diff={active?.diff ?? ''} path={active?.path} status={active?.status} />
				</div>

				<label>
					<span class="message-label">
						Commit message
						<button type="button" class="suggest" onclick={applySuggestion}>Suggest</button>
					</span>
					<textarea
						bind:value={message}
						oninput={() => (messageEdited = true)}
						rows="3"
						required
					></textarea>
				</label>
			{/if}

			{#if errorMsg}
				<p class="error">{errorMsg}</p>
			{/if}

			<div class="row">
				<button
					class="primary"
					type="button"
					disabled={committing || diffs.length === 0}
					onclick={commit}
				>
					{committing ? 'Committing…' : 'Commit all changes'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
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
		width: min(920px, 100%);
		max-height: 90vh;
		overflow: auto;
		display: grid;
		gap: 0.85rem;
	}

	h2 {
		margin: 0;
	}

	.message-label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.suggest {
		font-size: 0.8rem;
		padding: 0.2rem 0.5rem;
		border: 0;
		background: transparent;
		color: var(--accent);
	}

	.suggest:hover {
		text-decoration: underline;
	}

	.diff-layout {
		display: grid;
		grid-template-columns: 220px 1fr;
		gap: 0.75rem;
		min-height: 240px;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: auto;
		max-height: 320px;
	}

	ul button {
		width: 100%;
		text-align: left;
		border: 0;
		border-radius: 0;
		border-bottom: 1px solid var(--border);
		background: transparent;
		font-size: 0.85rem;
	}

	ul button.active {
		background: var(--bg-soft);
	}

	.st {
		display: inline-block;
		min-width: 4rem;
		color: var(--ink-muted);
		font-size: 0.7rem;
	}

	@media (max-width: 720px) {
		.diff-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
