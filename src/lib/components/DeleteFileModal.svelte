<script lang="ts">
	import { displayName } from '$lib/display';

	let {
		open = $bindable(false),
		filePath,
		busy = false,
		errorMsg = '',
		hasUnsaved = false,
		onConfirm,
		onCancel
	}: {
		open?: boolean;
		filePath: string;
		busy?: boolean;
		errorMsg?: string;
		hasUnsaved?: boolean;
		onConfirm: () => void | Promise<void>;
		onCancel?: () => void;
	} = $props();

	const fileName = $derived(displayName(filePath.split('/').pop() ?? filePath));

	function close() {
		if (busy) return;
		open = false;
		onCancel?.();
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
			aria-labelledby="delete-file-title"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="row" style="justify-content: space-between">
				<h2 id="delete-file-title">Delete file?</h2>
				<button type="button" disabled={busy} onclick={close}>Close</button>
			</div>

			<p>
				Delete <strong>{fileName}</strong> and push the change to GitHub?
			</p>
			<p class="muted path">{filePath}</p>
			<p class="muted">
				This cannot be undone from the app. The delete will be committed and pushed
				automatically.
			</p>
			{#if hasUnsaved}
				<p class="error">You have unsaved edits in this file; they will be discarded.</p>
			{/if}

			{#if errorMsg}
				<p class="error">{errorMsg}</p>
			{/if}

			<div class="row actions">
				<button type="button" disabled={busy} onclick={close}>Cancel</button>
				<button class="danger" type="button" disabled={busy} onclick={() => onConfirm()}>
					{busy ? 'Deleting…' : 'Delete & push'}
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
		width: min(420px, 100%);
		display: grid;
		gap: 0.75rem;
	}

	h2 {
		margin: 0;
		font-size: 1.1rem;
	}

	p {
		margin: 0;
		line-height: 1.4;
	}

	.path {
		font-family: var(--font-mono);
		font-size: 0.85rem;
		word-break: break-all;
	}

	.actions {
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
