import { isHttpError, json } from '@sveltejs/kit';
import { AiError } from './ai';
import { DivergedError } from './git';

const NOT_FOUND = new Set(['Repository not found', 'File not found']);

export function fail(status: number, message: string) {
	return json({ message }, { status });
}

/**
 * Turn an error caught in an API route into a JSON response.
 * `error()` from inside the try is rethrown so its status survives.
 */
export function failFrom(err: unknown, fallback: string): Response {
	if (isHttpError(err)) throw err;
	if (err instanceof AiError) {
		return json({ message: err.message, needsAiKey: true }, { status: 400 });
	}
	if (err instanceof DivergedError) {
		return json({ message: err.message, code: err.code }, { status: 400 });
	}
	const message = err instanceof Error ? err.message : fallback;
	return fail(NOT_FOUND.has(message) ? 404 : 400, message);
}
