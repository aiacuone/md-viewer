<script lang="ts">
	import type { SyncStatus } from '$lib/types';

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

	let busy = $state<'pull' | null>(null);
	let errorMsg = $state('');

	const canCommit = $derived(!!status && status.uncommitted.length > 0);

	const label = $derived.by(() => {
		if (!status) return 'Loading…';
		const parts: string[] = [];
		if (status.uncommitted.length) parts.push(`${status.uncommitted.length} uncommitted`);
		else parts.push('clean');
		if (status.ahead) parts.push(`ahead ${status.ahead}`);
		if (status.behind) parts.push(`behind ${status.behind}`);
		return `${status.branch} · ${parts.join(' · ')}`;
	});

	async function pull() {
		busy = 'pull';
		errorMsg = '';
		try {
			const res = await fetch(`/api/repos/${repoId}/pull`, { method: 'POST' });
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.message || 'Pull failed');
			await onRefresh();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Pull failed';
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
		errorMsg = '';
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
				<button
					class="primary"
					type="button"
					disabled={busy !== null || !canCommit}
					onclick={openCommit}
				>
					Commit + push
				</button>
			</div>

			{#if errorMsg}
				<p class="error">{errorMsg}</p>
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
		width: min(420px, 100%);
		display: grid;
		gap: 0.85rem;
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
	}
</style>
