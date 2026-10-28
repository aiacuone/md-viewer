<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { sendBugReport } from '$lib/bug-report';
	import Icon from '$lib/components/Icon.svelte';

	let open = $state(false);
	let form = $state<HTMLFormElement>();
	let kind = $state<'bug' | 'feature'>('bug');
	let title = $state('');
	let description = $state('');
	let page = $state('');
	let sending = $state(false);
	let issueUrl = $state('');
	let errorMsg = $state('');
	const feature = $derived(kind === 'feature');

	// Settings is where the button lives, so the page worth reporting is the one before it.
	afterNavigate(({ from }) => {
		if (from && from.url.pathname !== '/settings') page = from.url.pathname + from.url.search;
	});

	function close() {
		open = false;
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!form) return;
		sending = true;
		errorMsg = '';
		try {
			issueUrl = await sendBugReport(form);
			title = description = page = '';
			kind = 'bug';
			open = false;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'The report was not sent.';
		} finally {
			sending = false;
		}
	}
</script>

<div class="card stack">
	<h2>Bugs and features</h2>
	<p class="muted">Report a bug or ask for a feature. Only you can see this. It opens an issue in your private feedback repo on GitHub.</p>
	{#if issueUrl}
		<p class="muted">Reported. <a href={issueUrl} target="_blank" rel="noopener noreferrer">Open the issue</a></p>
	{/if}
	<div class="row">
		<button
			class="primary with-icon"
			type="button"
			onclick={() => {
				issueUrl = '';
				open = true;
			}}
		>
			<Icon name="spark" />
			Report or request
		</button>
	</div>
</div>

{#if open}
	<div
		class="backdrop"
		role="presentation"
		onpointerdown={(event) => event.target === event.currentTarget && close()}
		onkeydown={(event) => event.key === 'Escape' && close()}
	>
		<div class="dialog card" role="dialog" aria-modal="true" aria-labelledby="bug-report-title" tabindex="-1">
			<div class="row" style="justify-content: space-between">
				<h2 id="bug-report-title">{feature ? 'Request a feature' : 'Report a bug'}</h2>
				<button type="button" class="icon-btn" aria-label="Close" title="Close" onclick={close}>
					<Icon name="close" />
				</button>
			</div>
			<form class="stack" bind:this={form} onsubmit={submit}>
				<div class="row" role="group" aria-label="Type">
					<button type="button" class:primary={!feature} aria-pressed={!feature} onclick={() => (kind = 'bug')}>Bug</button>
					<button type="button" class:primary={feature} aria-pressed={feature} onclick={() => (kind = 'feature')}>Feature</button>
				</div>
				<input type="hidden" name="kind" value={kind} />
				<label>
					Title
					<input name="title" maxlength="120" required bind:value={title} />
				</label>
				<label>
					{feature ? 'What should it do' : 'What happened'}
					<textarea name="description" rows="4" bind:value={description}></textarea>
				</label>
				<label>
					Page
					<input name="page" bind:value={page} />
				</label>
				<label>
					Screenshot (optional)
					<input name="screenshot" type="file" accept="image/*" />
				</label>
				{#if errorMsg}
					<p class="error">{errorMsg}</p>
				{/if}
				<div class="row">
					<button class="primary with-icon" type="submit" disabled={sending}>
						<Icon name="save" />
						{sending ? 'Sending…' : feature ? 'Send request' : 'Send report'}
					</button>
				</div>
			</form>
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
		overflow-y: auto;
	}

	.dialog {
		width: min(480px, 100%);
		display: grid;
		gap: 0.85rem;
	}

	h2 {
		margin: 0;
	}
</style>
