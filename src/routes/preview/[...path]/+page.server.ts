import { error } from '@sveltejs/kit';
import type { PageServerLoad, EntryGenerator } from './$types';
import { loadPreview, previewEntryParams } from '$lib/server/preview';

export const prerender = true;
export const csr = false;

export const entries: EntryGenerator = () => previewEntryParams();

function localPath(value: string | null): string {
	if (!value || !value.startsWith('/') || value.startsWith('//')) return '';
	if (value.includes('\\') || value.includes('://')) return '';
	return value;
}

export const load: PageServerLoad = ({ params, url }) => {
	const node = loadPreview(params.path ?? '');
	if (!node) error(404, 'Not found');
	return { node, backTo: localPath(url.searchParams.get('from')) };
};
