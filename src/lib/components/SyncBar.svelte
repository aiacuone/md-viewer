<script lang="ts">
	import type { ResolveOption, SyncStatus } from '$lib/types';

	let {
		repoId,
		status,
		onRefresh,
		onCommit,
		open = $bindable(false),
		showTrigger = true,
		triggerClass = ''
	}: {
		repoId: string;
		status: SyncStatus | null;
		onRefresh: () => void | Promise<void>;
		onCommit: () => void;
		open?: boolean;
		showTrigger?: boolean;
		triggerClass?: string;
	} = $props();

	let busy = $state<'pull' | 'push' | 'options' | 'apply' | null>(null);
	let errorMsg = $state('');
	let diverged = $state(false);
	let options = $state<ResolveOption[]>([]);
	let selectedId = $state<string | null>(null);
	let needsAiKey = $state(false);

	const canCommit = $derived(!!status && status.uncommitted.length > 0);
	const canPush = $derived(!!status && status.clean && status.ahead > 0 && status.behind === 0);
	const selected = $derived(options.find((o) => o.id === selectedId) ?? null);

	const label = $derived.by(() => {
		if (!status) return 'Loading…';
		const parts: string[] = [];
		if (status.uncommitted.length) parts.push(`${status.uncommitted.length} uncommitted`);
		else parts.push('clean');
		if (status.ahead) parts.push(`ahead ${status.ahead}`);
		if (status.behind) parts.push(`behind ${status.behind}`);
		return `${status.branch} · ${parts.join(' · ')}`;
	});

	$effect(() => {
		if (!open) {
			errorMsg = '';
			diverged = false;
			options = [];
			selectedId = null;
			needsAiKey = false;
			busy = null;
		}
	});

	async function pull() {
		busy = 'pull';
		errorMsg = '';
		needsAiKey = false;
		diverged = false;
		options = [];
		selectedId = null;
		try {
			const res = await fetch(`/api/repos/${repoId}/pull`, { method: 'POST' });
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				if (body.code === 'HISTORIES_DIVERGED' || /diverged/i.test(String(body.message ?? ''))) {
					diverged = true;
					errorMsg = body.message || 'Histories have diverged.';
					await loadOptions();
					return;
				}
				throw new Error(body.message || 'Pull failed');
			}
			await onRefresh();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Pull failed';
		} finally {
			busy = null;
		}
	}

	async function pushOnly() {
		busy = 'push';
		errorMsg = '';
		try {
			const res = await fetch(`/api/repos/${repoId}/push`, { method: 'POST' });
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.message || 'Push failed');
			await onRefresh();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Push failed';
		} finally {
			busy = null;
		}
	}

	async function loadOptions() {
		busy = 'options';
		needsAiKey = false;
		try {
			const res = await fetch(`/api/repos/${repoId}/resolve/options`, { method: 'POST' });
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				needsAiKey = Boolean(body.needsAiKey);
				throw new Error(body.message || 'Failed to load resolve options');
			}
			options = body.options ?? [];
			selectedId = options[0]?.id ?? null;
			diverged = true;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load resolve options';
		} finally {
			busy = null;
		}
	}

	async function applyResolve() {
		if (!selected) return;
		if (selected.strategy === 'keep_local') {
			const ok = confirm(
				'Force-push this device’s history to GitHub? Remote-only commits will be overwritten.'
			);
			if (!ok) return;
		}
		busy = 'apply';
		errorMsg = '';
		needsAiKey = false;
		try {
			const res = await fetch(`/api/repos/${repoId}/resolve/apply`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ strategy: selected.strategy, optionId: selected.id })
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				needsAiKey = Boolean(body.needsAiKey);
				throw new Error(body.message || 'Resolve failed');
			}
			diverged = false;
			options = [];
			selectedId = null;
			await onRefresh();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Resolve failed';
		} finally {
			busy = null;
		}
	}

	function openCommit() {
		open = false;
		onCommit();
	}

	function close() {
		open = false;
	}
</script>

{#if showTrigger}
	<button type="button" class="sync-trigger {triggerClass}" onclick={() => (open = true)}>
		Sync
		<span class="muted">{label}</span>
	</button>
{/if}

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
				<h2>Sync</h2>
				<button type="button" onclick={close}>Close</button>
			</div>

			<p class="status muted">{label}</p>

			<div class="row actions">
				<button type="button" disabled={busy !== null} onclick={pull}>
					{busy === 'pull' ? 'Pulling…' : 'Pull'}
				</button>
				{#if canPush}
					<button type="button" disabled={busy !== null} onclick={pushOnly}>
						{busy === 'push' ? 'Pushing…' : 'Push'}
					</button>
				{/if}
				<button
					class="primary"
					type="button"
					disabled={busy !== null || !canCommit}
					onclick={openCommit}
				>
					Commit + push
				</button>
			</div>

			{#if diverged || options.length}
				<div class="resolve stack">
					<p class="resolve-title">Histories diverged — pick a resolve option</p>
					{#if busy === 'options'}
						<p class="muted">Asking AI for options…</p>
					{:else if options.length}
						{#each options as opt}
							<label class="option">
								<input
									type="radio"
									name="resolve"
									value={opt.id}
									checked={selectedId === opt.id}
									disabled={busy !== null}
									onchange={() => (selectedId = opt.id)}
								/>
								<span>
									<strong>{opt.title}</strong>
									<span class="muted option-summary">{opt.summary}</span>
								</span>
							</label>
						{/each}
						<button
							class="primary"
							type="button"
							disabled={busy !== null || !selected}
							onclick={applyResolve}
						>
							{busy === 'apply' ? 'Applying…' : 'Apply & push'}
						</button>
					{:else if !needsAiKey}
						<button type="button" disabled={busy !== null} onclick={loadOptions}>
							Get AI options
						</button>
					{/if}
				</div>
			{/if}

			{#if errorMsg}
				<p class="error">{errorMsg}</p>
			{/if}
			{#if needsAiKey}
				<p class="muted">
					<a href="/settings">Add a DeepSeek API key in Settings</a> to use AI resolve.
				</p>
			{/if}
		</div>
	</div>
{/if}

<style>
	.sync-trigger {
		display: inline-flex;
		gap: 0.5rem;
		align-items: center;
	}

	.sync-trigger .muted {
		font-size: 0.85rem;
		font-weight: 400;
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
		display: grid;
		gap: 0.85rem;
		max-height: min(90vh, 640px);
		overflow: auto;
	}

	h2 {
		margin: 0;
		font-size: 1.1rem;
	}

	.status {
		margin: 0;
		font-size: 0.95rem;
	}

	.actions {
		justify-content: flex-end;
		flex-wrap: wrap;
	}

	.resolve {
		gap: 0.65rem;
		padding-top: 0.25rem;
		border-top: 1px solid var(--border);
	}

	.resolve-title {
		margin: 0;
		font-weight: 600;
		font-size: 0.95rem;
	}

	.option {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.65rem;
		align-items: start;
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		cursor: pointer;
	}

	.option strong {
		display: block;
		margin-bottom: 0.15rem;
	}

	.option-summary {
		display: block;
		font-size: 0.85rem;
		line-height: 1.35;
	}

	.stack {
		display: grid;
	}
</style>
