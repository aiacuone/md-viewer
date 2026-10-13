<script lang="ts">
	let { name }: { name:
		| 'back'
		| 'preview'
		| 'edit'
		| 'save'
		| 'convert'
		| 'sync'
		| 'diff'
		| 'trash'
		| 'close'
		| 'pull'
		| 'push'
		| 'plus'
		| 'check'
		| 'undo'
		| 'more'
		| 'spark'
		| 'repos'
		| 'settings'
		| 'login'
		| 'logout' } = $props();
</script>

<svg viewBox="0 0 14 14" aria-hidden="true">
	{#if name === 'back'}
		<path
			d="M8.75 2.25 3.5 7l5.25 4.75"
			fill="none"
			stroke="currentColor"
			stroke-width="1.75"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{:else if name === 'preview'}
		<path
			d="M1.4 7s2.1-3.4 5.6-3.4S12.6 7 12.6 7s-2.1 3.4-5.6 3.4S1.4 7 1.4 7z"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linejoin="round"
		/>
		<circle cx="7" cy="7" r="1.55" fill="none" stroke="currentColor" stroke-width="1.4" />
	{:else if name === 'edit'}
		<path
			d="M8.4 2.2 11.8 5.6 4.9 12.5 1.6 12.8 1.9 9.5z"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linejoin="round"
		/>
		<path
			d="M7.3 3.3 10.7 6.7"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
		/>
	{:else if name === 'save'}
		<path
			d="M2.4 2.2h6.6L11.8 5v6.8H2.4z"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linejoin="round"
		/>
		<path d="M4.4 2.2v3h4.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
		<path
			d="M4.6 11.8v-3.2h4.8v3.2"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linejoin="round"
		/>
	{:else if name === 'convert'}
		<path d="M4.6 2h3.2v1.5H4.6z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
		<path
			d="M3.6 3h6.8c.5 0 .9.4.9.9V12H2.7V3.9c0-.5.4-.9.9-.9z"
			fill="none"
			stroke="currentColor"
			stroke-width="1.3"
			stroke-linejoin="round"
		/>
		<path
			d="M4.6 6.4h4.8M4.6 8.4h4.8M4.6 10.4h3"
			fill="none"
			stroke="currentColor"
			stroke-width="1.3"
			stroke-linecap="round"
		/>
	{:else if name === 'sync'}
		<path
			d="M11.4 4.4A4.5 4.5 0 0 0 3.3 6"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
		/>
		<path
			d="M2.2 3.2v2.9h2.9"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M2.6 9.6A4.5 4.5 0 0 0 10.7 8"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
		/>
		<path
			d="M11.8 10.8V7.9H8.9"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{:else if name === 'diff'}
		<path
			d="M2.2 2.2h3.6v9.6H2.2zM8.2 2.2h3.6v9.6H8.2z"
			fill="none"
			stroke="currentColor"
			stroke-width="1.3"
			stroke-linejoin="round"
		/>
	{:else if name === 'trash'}
		<path
			d="M2.6 3.8h8.8M5.1 3.8V2.4h3.8v1.4"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M3.6 3.8 4.2 11.6h5.6l.6-7.8M5.6 5.8v4M8.4 5.8v4"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{:else if name === 'close'}
		<path
			d="M3.2 3.2 10.8 10.8M10.8 3.2 3.2 10.8"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
		/>
	{:else if name === 'pull'}
		<path
			d="M7 2.2v6.4M4.3 6.2 7 8.9l2.7-2.7M2.6 11.4h8.8"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{:else if name === 'push'}
		<path
			d="M7 11.8V5.4M4.3 7.8 7 5.1l2.7 2.7M2.6 2.6h8.8"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{:else if name === 'plus'}
		<path
			d="M7 2.6v8.8M2.6 7h8.8"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
		/>
	{:else if name === 'check'}
		<path
			d="M2.6 7.2 5.5 10.1 11.4 3.8"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{:else if name === 'undo'}
		<path
			d="M5 3.4 2.4 6l2.6 2.6"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M2.6 6h6.1a3.1 3.1 0 1 1 0 6.2H7"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
		/>
	{:else if name === 'more'}
		<circle cx="7" cy="3" r="1" fill="currentColor" />
		<circle cx="7" cy="7" r="1" fill="currentColor" />
		<circle cx="7" cy="11" r="1" fill="currentColor" />
	{:else if name === 'spark'}
		<path
			d="M7 1.6v2.2M7 10.2v2.2M1.6 7h2.2M10.2 7h2.2M3.2 3.2l1.5 1.5M9.3 9.3l1.5 1.5M10.8 3.2 9.3 4.7M4.7 9.3 3.2 10.8"
			fill="none"
			stroke="currentColor"
			stroke-width="1.3"
			stroke-linecap="round"
		/>
	{:else if name === 'repos'}
		<path
			d="M2.2 2.4h3.8v3.8H2.2zM8 2.4h3.8v3.8H8zM2.2 7.8h3.8v3.8H2.2zM8 7.8h3.8v3.8H8z"
			fill="none"
			stroke="currentColor"
			stroke-width="1.3"
			stroke-linejoin="round"
		/>
	{:else if name === 'settings'}
		<path
			d="M2.2 3.4H3.3M5.9 3.4H11.8M2.2 7H8.1M10.7 7H11.8M2.2 10.6H4.5M7.1 10.6H11.8"
			fill="none"
			stroke="currentColor"
			stroke-width="1.3"
			stroke-linecap="round"
		/>
		<circle cx="4.6" cy="3.4" r="1.15" fill="none" stroke="currentColor" stroke-width="1.3" />
		<circle cx="9.4" cy="7" r="1.15" fill="none" stroke="currentColor" stroke-width="1.3" />
		<circle cx="5.8" cy="10.6" r="1.15" fill="none" stroke="currentColor" stroke-width="1.3" />
	{:else if name === 'login'}
		<path
			d="M8.2 2.4h2.2a.8.8 0 0 1 .8.8v7.6a.8.8 0 0 1-.8.8H8.2"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path d="M1.8 7h5.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
		<path
			d="M5.4 4.8 7.6 7 5.4 9.2"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{:else if name === 'logout'}
		<path
			d="M5.8 2.4H3.6a.8.8 0 0 0-.8.8v7.6a.8.8 0 0 0 .8.8h2.2"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path d="M6.4 7h5.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
		<path
			d="M10 4.8 12.2 7 10 9.2"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{/if}
</svg>

<style>
	svg {
		width: 1.05rem;
		height: 1.05rem;
		display: block;
		flex-shrink: 0;
	}
</style>
