<script lang="ts">
	import { onMount } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { EditorState } from '@codemirror/state';
	import { markdown } from '@codemirror/lang-markdown';
	import { keymap } from '@codemirror/view';
	import { defaultKeymap, historyKeymap } from '@codemirror/commands';

	let {
		value = $bindable(''),
		onSave
	}: {
		value?: string;
		onSave?: () => void;
	} = $props();

	let host: HTMLDivElement | undefined = $state();
	let view: EditorView | null = null;
	let applyingExternal = false;

	onMount(() => {
		if (!host) return;
		view = new EditorView({
			parent: host,
			state: EditorState.create({
				doc: value,
				extensions: [
					basicSetup,
					markdown(),
					EditorView.lineWrapping,
					keymap.of([
						...defaultKeymap,
						...historyKeymap,
						{
							key: 'Mod-s',
							run: () => {
								onSave?.();
								return true;
							}
						}
					]),
					EditorView.theme({
						'&': {
							height: '100%',
							width: '100%',
							fontSize: '14px',
							backgroundColor: '#0a0c10',
							color: '#e8eaef'
						},
						'.cm-content': {
							fontFamily: 'var(--font-mono)',
							caretColor: '#7eb6ff'
						},
						'.cm-cursor, .cm-dropCursor': {
							borderLeftColor: '#7eb6ff',
							borderLeftWidth: '2px'
						},
						'.cm-gutters': {
							backgroundColor: '#0e1014',
							color: '#6b7385',
							border: 'none'
						},
						'.cm-activeLine': { backgroundColor: '#161a21' },
						'&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
							backgroundColor: '#2a3a52'
						}
					}),
					EditorView.updateListener.of((update) => {
						if (update.docChanged && !applyingExternal) {
							value = update.state.doc.toString();
						}
					})
				]
			})
		});

		view.focus();

		return () => {
			view?.destroy();
			view = null;
		};
	});

	$effect(() => {
		if (!view) return;
		const current = view.state.doc.toString();
		if (value !== current) {
			applyingExternal = true;
			view.dispatch({
				changes: { from: 0, to: current.length, insert: value }
			});
			applyingExternal = false;
		}
	});
</script>

<div class="editor" bind:this={host}></div>

<style>
	.editor {
		height: min(70vh, 720px);
		width: 100%;
		max-width: 100%;
		min-width: 0;
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
	}

	.editor :global(.cm-editor) {
		height: 100%;
		max-width: 100%;
	}
</style>
