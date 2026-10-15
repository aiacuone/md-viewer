<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	let {
		part,
		preview = false,
		backHref = '',
		viewMode = 'preview',
		showDiff = false,
		dirty = false,
		saving = false,
		onBack,
		onView,
		onSave,
		onConvert,
		onSync,
		onPull,
		onPush,
		onDiff,
		onDelete
	}: {
		part: 'header' | 'tools' | 'bar';
		preview?: boolean;
		backHref?: string;
		viewMode?: 'preview' | 'edit';
		showDiff?: boolean;
		dirty?: boolean;
		saving?: boolean;
		onBack?: () => void;
		onView?: (mode: 'preview' | 'edit') => void;
		onSave?: () => void;
		onConvert?: () => void;
		onSync?: () => void;
		onPull?: () => void;
		onPush?: () => void;
		onDiff?: () => void;
		onDelete?: () => void;
	} = $props();
</script>

{#snippet saveButton()}
	<button
		class="primary icon-btn action-save"
		type="button"
		disabled={preview ? false : saving || !dirty}
		aria-label={saving ? 'Saving' : 'Save'}
		title={saving ? 'Saving' : 'Save'}
		data-preview-disabled={preview ? '' : undefined}
		onclick={preview ? undefined : onSave}
	>
		<Icon name="save" />
		{#if dirty && !saving}<span class="dirty-dot" aria-hidden="true"></span>{/if}
	</button>
{/snippet}

{#snippet viewToggle()}
	<div class="view-toggle" role="group" aria-label="View mode">
		<button
			type="button"
			class="icon-btn"
			class:active={viewMode === 'preview'}
			aria-label="Preview"
			title="Preview"
			data-preview-disabled={preview ? '' : undefined}
			onclick={preview ? undefined : () => onView?.('preview')}
		>
			<Icon name="preview" />
		</button>
		<button
			type="button"
			class="icon-btn"
			class:active={viewMode === 'edit'}
			aria-label="Edit"
			title="Edit"
			data-preview-disabled={preview ? '' : undefined}
			onclick={preview ? undefined : () => onView?.('edit')}
		>
			<Icon name="edit" />
		</button>
	</div>
{/snippet}

{#snippet convertButton()}
	<button
		type="button"
		class="icon-btn"
		aria-label={preview ? 'AI' : 'Convert'}
		title={preview ? 'AI' : 'Convert'}
		data-preview-disabled={preview ? '' : undefined}
		onclick={preview ? undefined : onConvert}
	>
		<Icon name="convert" />
	</button>
{/snippet}

{#snippet syncButton()}
	<button
		type="button"
		class="icon-btn"
		aria-label="Sync"
		title="Sync"
		data-preview-disabled={preview ? '' : undefined}
		onclick={preview ? undefined : onSync}
	>
		<Icon name="sync" />
	</button>
{/snippet}

{#snippet pullButton()}
	<button
		type="button"
		class="icon-btn"
		aria-label="Pull"
		title="Pull"
		data-preview-disabled={preview ? '' : undefined}
		onclick={preview ? undefined : onPull}
	>
		<Icon name="pull" />
	</button>
{/snippet}

{#snippet pushButton()}
	<button
		type="button"
		class="icon-btn"
		aria-label="Push"
		title="Push"
		data-preview-disabled={preview ? '' : undefined}
		onclick={preview ? undefined : onPush}
	>
		<Icon name="push" />
	</button>
{/snippet}

{#snippet diffButton()}
	<button
		type="button"
		class="icon-btn"
		class:active={showDiff}
		aria-label={showDiff ? 'Hide diff' : 'View diff'}
		title={showDiff ? 'Hide diff' : 'View diff'}
		data-preview-disabled={preview ? '' : undefined}
		onclick={preview ? undefined : onDiff}
	>
		<Icon name="diff" />
	</button>
{/snippet}

{#snippet deleteButton()}
	<button
		type="button"
		class="danger icon-btn"
		aria-label="Delete"
		title="Delete"
		data-preview-disabled={preview ? '' : undefined}
		onclick={preview ? undefined : onDelete}
	>
		<Icon name="trash" />
	</button>
{/snippet}

{#if part === 'header'}
	{@render convertButton()}
	{@render syncButton()}
	{@render deleteButton()}
{:else if part === 'tools'}
	<div class="tool-group">
		{@render saveButton()}
		{@render viewToggle()}
		{@render diffButton()}
		{@render convertButton()}
		{#if preview || onPull}
			{@render pullButton()}
			{@render pushButton()}
		{:else}
			{@render syncButton()}
		{/if}
		{@render deleteButton()}
	</div>
{:else}
	<nav class="action-bar mobile-only" aria-label="File actions">
		{#if preview}
			<a class="icon-btn action-back" href={backHref} data-history-back aria-label="Back" title="Back">
				<Icon name="back" />
			</a>
		{:else}
			<button type="button" class="icon-btn action-back" onclick={onBack} aria-label="Back" title="Back">
				<Icon name="back" />
			</button>
		{/if}
		{@render viewToggle()}
		{@render saveButton()}
		{@render convertButton()}
		{@render syncButton()}
		{@render diffButton()}
		{@render deleteButton()}
	</nav>
{/if}

<style>
	.view-toggle {
		display: inline-flex;
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
	}

	.view-toggle button {
		border: 0;
		border-radius: 0;
		background: transparent;
	}

	.view-toggle button + button {
		border-left: 1px solid var(--border);
	}

	.view-toggle button.active {
		background: var(--bg-soft);
		color: var(--accent);
		font-weight: 600;
	}

	.tool-group .view-toggle {
		border: 0;
		background: transparent;
	}

	.tool-group .view-toggle button + button {
		border-left: 0;
	}

	.tool-group .view-toggle button.active {
		background: transparent;
		color: var(--accent);
	}

	.action-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 40;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.2rem;
		padding: 0.4rem 0.4rem calc(0.4rem + env(safe-area-inset-bottom));
		background: color-mix(in srgb, var(--bg-elevated) 92%, transparent);
		border-top: 1px solid var(--border);
		backdrop-filter: blur(10px);
		box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
	}

	.action-bar .view-toggle {
		flex: 0 0 auto;
	}

	.action-bar :global(button.icon-btn),
	.action-bar :global(a.icon-btn) {
		width: 2rem;
		height: 2rem;
	}

	.action-bar button.active {
		background: var(--bg);
		color: var(--accent);
	}

	.action-save {
		position: relative;
	}

	.dirty-dot {
		position: absolute;
		top: 0.3rem;
		right: 0.3rem;
		width: 0.4rem;
		height: 0.4rem;
		border-radius: 50%;
		background: var(--accent-ink);
	}

	@media (min-width: 768px) {
		.mobile-only {
			display: none !important;
		}
	}
</style>
