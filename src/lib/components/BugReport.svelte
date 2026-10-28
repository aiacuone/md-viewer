<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { sendBugReport } from '$lib/bug-report';
	import Icon from '$lib/components/Icon.svelte';

	let form = $state<HTMLFormElement>();
	let page = $state('');
	let sending = $state(false);
	let issueUrl = $state('');
	let errorMsg = $state('');

	// Settings is where the form lives, so the page worth reporting is the one before it.
	afterNavigate(({ from }) => {
		if (from && from.url.pathname !== '/settings') page = from.url.pathname + from.url.search;
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!form) return;
		sending = true;
		issueUrl = '';
		errorMsg = '';
		try {
			issueUrl = await sendBugReport(form);
			form.reset();
			page = '';
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'The bug report was not sent.';
		} finally {
			sending = false;
		}
	}
</script>

<form class="card stack" bind:this={form} onsubmit={submit}>
	<h2>Report a bug</h2>
	<p class="muted">Only you can see this. It opens an issue in your private bugs repo on GitHub.</p>
	<label>
		Title
		<input name="title" maxlength="120" required />
	</label>
	<label>
		What happened
		<textarea name="description" rows="4"></textarea>
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
	{#if issueUrl}
		<p class="muted">Reported. <a href={issueUrl} target="_blank" rel="noopener noreferrer">Open the issue</a></p>
	{/if}
	<button class="primary with-icon" type="submit" disabled={sending}>
		<Icon name="save" />
		{sending ? 'Sending…' : 'Send report'}
	</button>
</form>
