import { getSettings } from './settings';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
export const AI_MODEL = 'deepseek-flash';

export class AiError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AiError';
	}
}

export async function getAiKey(): Promise<string> {
	const settings = await getSettings();
	const key = settings.aiKey?.trim();
	if (!key) {
		throw new AiError('Add a DeepSeek API key under Settings to use AI features.');
	}
	return key;
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type ChatOptions = {
	messages: ChatMessage[];
	/** Prefer JSON object in the response */
	json?: boolean;
	temperature?: number;
	maxTokens?: number;
};

export async function chatCompletion(opts: ChatOptions): Promise<string> {
	const apiKey = await getAiKey();
	const body: Record<string, unknown> = {
		model: AI_MODEL,
		messages: opts.messages,
		temperature: opts.temperature ?? 0.3,
		stream: false
	};
	if (opts.json) {
		body.response_format = { type: 'json_object' };
	}
	if (opts.maxTokens) {
		body.max_tokens = opts.maxTokens;
	}

	let res: Response;
	try {
		res = await fetch(DEEPSEEK_URL, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify(body)
		});
	} catch {
		throw new AiError('Could not reach DeepSeek. Check network connectivity.');
	}

	const data = (await res.json().catch(() => ({}))) as {
		error?: { message?: string };
		choices?: Array<{ message?: { content?: string } }>;
	};

	if (!res.ok) {
		const msg = data.error?.message || `DeepSeek request failed (${res.status})`;
		if (res.status === 401 || res.status === 403) {
			throw new AiError('DeepSeek authentication failed. Check the API key under Settings.');
		}
		throw new AiError(msg);
	}

	const content = data.choices?.[0]?.message?.content?.trim();
	if (!content) throw new AiError('DeepSeek returned an empty response.');
	return content;
}

export async function chatJson<T>(opts: ChatOptions): Promise<T> {
	const raw = await chatCompletion({ ...opts, json: true });
	try {
		return JSON.parse(raw) as T;
	} catch {
		throw new AiError('DeepSeek returned invalid JSON.');
	}
}
