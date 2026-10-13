import { error } from '@sveltejs/kit';
import type { PageServerLoad, EntryGenerator } from './$types';
import { aboutPlatform, aboutText } from '$lib/preview/about';
import { loadPreview, previewEntryParams, previewTools } from '$lib/server/preview';

export const prerender = true;
export const csr = false;

export const entries: EntryGenerator = () => previewEntryParams();

export const load: PageServerLoad = ({ params }) => {
	const node = loadPreview(params.path ?? '');
	if (!node) error(404, 'Not found');
	return {
		node,
		aboutText,
		aboutPlatform,
		tools: previewTools()
	};
};
