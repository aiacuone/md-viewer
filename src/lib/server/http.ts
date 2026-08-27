import { json } from '@sveltejs/kit';

export function fail(status: number, message: string) {
	return json({ message }, { status });
}
