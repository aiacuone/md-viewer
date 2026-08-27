<script lang="ts">
	import { displayName } from '$lib/display';
	import {
		diffStats,
		parseDiffText,
		revertAllDiffLines,
		revertDiffLine,
		statusLabel
	} from '$lib/diff';

	let {
		diff,
		path,
		status,
		compareLabel = 'Compared to last commit',
		interactive = false,
		content = '',
		onRevert
	}: {
		diff: string;
		path?: string;
		status?: 'modified' | 'added' | 'deleted';
		compareLabel?: string;
		interactive?: boolean;
		content?: string;
		onRevert?: (nextContent: string) => void;
	} = $props();

	const lines = $derived(parseDiffText(diff));
	const stats = $derived(diffStats(lines));
	const hasChanges = $derived(stats.added > 0 || stats.removed > 0);

	function revertLine(index: number) {
		if (!onRevert) return;
		onRevert(revertDiffLine(content, lines, index));
	}

	function revertAll() {
		if (!onRevert) return;
		onRevert(revertAllDiffLines(content, diff));
	}
</script>

<div class="diff-view">
	<div class="diff-meta">
		{#if path}
			<strong>{displayName(path.split('/').pop() ?? path)}</strong>
		{/if}
		{#if status}
			<span class="badge">{statusLabel(status)}</span>
		{/if}
		<span class="muted compare">{compareLabel}</span>
		{#if interactive && hasChanges}
			<button type="button" class="revert-all" onclick={revertAll}>Revert all</button>
		{/if}
	</div>

	<div class="legend row">
		<span class="chip removed">− Removed ({stats.removed})</span>
		<span class="chip added">+ Added ({stats.added})</span>
		{#if interactive && hasChanges}
			<span class="muted hint">Tap × on a line to undo that change</span>
		{/if}
	</div>

	{#if !hasChanges && diff.trim()}
		<p class="muted empty">No line changes detected.</p>
	{:else if !diff.trim()}
		<p class="muted empty">No diff available.</p>
	{:else}
		<div class="lines" role="list">
			{#each lines as line, i}
				{#if line.type === 'header'}
					<div class="line header" role="listitem">{line.text}</div>
				{:else if line.type === 'remove'}
					<div class="line remove" role="listitem" aria-label="Removed line">
						<span class="sign" aria-hidden="true">−</span>
						<span class="text">{line.text || ' '}</span>
						{#if interactive}
							<button
								type="button"
								class="revert"
								title="Restore this line"
								aria-label="Restore removed line"
								onclick={() => revertLine(i)}
							>
								×
							</button>
						{/if}
					</div>
				{:else if line.type === 'add'}
					<div class="line add" role="listitem" aria-label="Added line">
						<span class="sign" aria-hidden="true">+</span>
						<span class="text">{line.text || ' '}</span>
						{#if interactive}
							<button
								type="button"
								class="revert"
								title="Remove this line"
								aria-label="Remove added line"
								onclick={() => revertLine(i)}
							>
								×
							</button>
						{/if}
					</div>
				{:else}
					<div class="line context" role="listitem" aria-label="Unchanged line">
						<span class="sign" aria-hidden="true">&nbsp;</span>
						<span class="text">{line.text || ' '}</span>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.diff-view {
		display: grid;
		gap: 0.65rem;
	}

	.diff-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
	}

	.revert-all {
		margin-left: auto;
		font-size: 0.8rem;
		padding: 0.25rem 0.55rem;
	}

	.badge {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.15rem 0.45rem;
		border-radius: 999px;
		border: 1px solid var(--border);
		color: var(--ink-muted);
	}

	.compare {
		font-size: 0.85rem;
	}

	.legend {
		gap: 0.5rem;
		align-items: center;
	}

	.hint {
		font-size: 0.75rem;
	}

	.chip {
		font-size: 0.75rem;
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		font-family: var(--font-mono);
	}

	.chip.removed {
		background: color-mix(in srgb, var(--removed) 18%, transparent);
		color: var(--removed);
	}

	.chip.added {
		background: color-mix(in srgb, var(--added) 18%, transparent);
		color: var(--added);
	}

	.lines {
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: auto;
		max-height: 320px;
		font-family: var(--font-mono);
		font-size: 0.78rem;
		line-height: 1.45;
		background: var(--bg);
	}

	.line {
		display: grid;
		grid-template-columns: 1.25rem 1fr auto;
		gap: 0.35rem;
		align-items: start;
		padding: 0.1rem 0.5rem;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
	}

	.line.context {
		grid-template-columns: 1.25rem 1fr;
	}

	.line:last-child {
		border-bottom: 0;
	}

	.sign {
		user-select: none;
		font-weight: 700;
		text-align: center;
	}

	.text {
		white-space: pre-wrap;
		word-break: break-word;
	}

	.revert {
		border: 0;
		background: transparent;
		color: var(--ink-muted);
		font-size: 1.1rem;
		line-height: 1;
		padding: 0 0.25rem;
		opacity: 0.7;
	}

	.revert:hover {
		opacity: 1;
		color: var(--danger);
	}

	.line.header {
		display: block;
		padding: 0.35rem 0.65rem;
		color: var(--ink-muted);
		background: var(--bg-soft);
		font-size: 0.72rem;
	}

	.line.remove {
		background: color-mix(in srgb, var(--removed) 12%, var(--bg));
	}

	.line.remove .sign {
		color: var(--removed);
	}

	.line.add {
		background: color-mix(in srgb, var(--added) 12%, var(--bg));
	}

	.line.add .sign {
		color: var(--added);
	}

	.line.context {
		color: var(--ink-muted);
	}

	.empty {
		margin: 0;
		font-size: 0.9rem;
	}
</style>
