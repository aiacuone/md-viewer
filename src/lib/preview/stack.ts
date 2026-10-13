const LABELS: [string, string][] = [
	['svelte', 'Svelte'],
	['@sveltejs/kit', 'SvelteKit'],
	['typescript', 'TypeScript'],
	['vite', 'Vite'],
	['codemirror', 'CodeMirror'],
	['marked', 'marked'],
	['isomorphic-git', 'isomorphic-git']
];

type PackageJson = {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
};

/** Names of tools present in package.json, so the list tracks dependency changes. */
export function toolList(pkg: PackageJson): string[] {
	const all = { ...pkg.devDependencies, ...pkg.dependencies };
	return LABELS.filter(([name]) => name in all).map(([, label]) => label);
}
