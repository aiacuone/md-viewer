<script lang="ts">
	import type { Command } from '@codemirror/view';
	import { cursorCharLeft, cursorCharRight, indentLess, indentMore, redo, undo } from '@codemirror/commands';
	import { cycleHeading, toggleBullet, toggleCheckbox, toggleWrap } from '$lib/editorCommands';

	let {
		visible = false,
		onRun
	}: {
		visible?: boolean;
		onRun: (command: Command) => void;
	} = $props();

	const buttons: { label: string; text: string; command: Command; gap?: boolean }[] = [
		{ label: 'Heading', text: '#', command: cycleHeading },
		{ label: 'Bold', text: 'B', command: toggleWrap('**') },
		{ label: 'Bullet list', text: '•', command: toggleBullet },
		{ label: 'Checkbox', text: '☐', command: toggleCheckbox },
		{ label: 'Inline code', text: '`', command: toggleWrap('`') },
		{ label: 'Indent', text: '⇥', command: indentMore, gap: true },
		{ label: 'Outdent', text: '⇤', command: indentLess },
		{ label: 'Undo', text: '↶', command: undo, gap: true },
		{ label: 'Redo', text: '↷', command: redo },
		{ label: 'Cursor left', text: '←', command: cursorCharLeft, gap: true },
		{ label: 'Cursor right', text: '→', command: cursorCharRight }
	];

	// Fixed elements sit on the layout viewport, which the on-screen keyboard
	// covers, so the bar is lifted by the gap between the two viewports.
	let lift = $state(0);

	$effect(() => {
		const viewport = window.visualViewport;
		if (!visible || !viewport) {
			lift = 0;
			return;
		}
		const update = () => {
			lift = Math.max(0, Math.round(window.innerHeight - (viewport.offsetTop + viewport.height)));
		};
		update();
		viewport.addEventListener('resize', update);
		viewport.addEventListener('scroll', update);
		return () => {
			viewport.removeEventListener('resize', update);
			viewport.removeEventListener('scroll', update);
		};
	});

	// Keep focus (and the keyboard) in the editor while a button is pressed.
	function keepFocus(event: Event) {
		event.preventDefault();
	}
</script>

{#if visible}
	<div
		class="toolbar"
		class:above-keyboard={lift > 0}
		style:bottom="{lift}px"
		role="toolbar"
		aria-label="Markdown formatting"
	>
		{#each buttons as button (button.label)}
			<button
				type="button"
				class:gap={button.gap}
				aria-label={button.label}
				title={button.label}
				onpointerdown={keepFocus}
				onmousedown={keepFocus}
				onclick={() => onRun(button.command)}
			>
				{button.text}
			</button>
		{/each}
	</div>
{/if}

<style>
	.toolbar {
		position: fixed;
		left: 0;
		right: 0;
		z-index: 60;
		display: flex;
		align-items: stretch;
		gap: 0.25rem;
		padding: 0.35rem 0.4rem calc(0.35rem + env(safe-area-inset-bottom));
		overflow-x: auto;
		overscroll-behavior-x: contain;
		background: var(--bg-elevated);
		border-top: 1px solid var(--border);
		scrollbar-width: none;
	}

	/* The keyboard already covers the home-indicator inset. */
	.toolbar.above-keyboard {
		padding-bottom: 0.35rem;
	}

	.toolbar::-webkit-scrollbar {
		display: none;
	}

	button {
		flex: none;
		min-width: 2.75rem;
		min-height: 2.75rem;
		padding: 0 0.6rem;
		border-radius: 8px;
		font-size: 1.1rem;
		line-height: 1;
		touch-action: manipulation;
	}

	button.gap {
		margin-left: 0.5rem;
	}

	/* Centre the row when it fits. Auto margins, unlike justify-content, leave the
	   left end reachable when it overflows and scrolls on a narrow phone. */
	button:first-child {
		margin-left: auto;
	}

	button:last-child {
		margin-right: auto;
	}
</style>
