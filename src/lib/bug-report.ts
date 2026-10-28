// Browser side of the bug reporter: shrinks the attached photo to fit the server's upload limit, then posts the form.

const MAX_SIDE = 1600;
const TARGET_BYTES = 400 * 1024;
const SENDABLE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

async function shrinkScreenshot(file: File): Promise<Blob> {
	if (file.size <= TARGET_BYTES && SENDABLE.includes(file.type)) return file;
	const bitmap = await createImageBitmap(file).catch(() => {
		throw new Error('That photo could not be read. Try a PNG or JPEG screenshot.');
	});
	const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	for (const quality of [0.85, 0.7, 0.55, 0.4]) {
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
		if (blob && blob.size <= TARGET_BYTES) return blob;
	}
	throw new Error('The photo is too large to send, even after shrinking.');
}

/** Sends the bug report form and returns the new issue's address. */
export async function sendBugReport(form: HTMLFormElement): Promise<string> {
	const data = new FormData(form);
	const file = data.get('screenshot');
	if (file instanceof File && file.size > 0) data.set('screenshot', await shrinkScreenshot(file), 'screenshot');
	else data.delete('screenshot');
	const res = await fetch('/api/bug-report', { method: 'POST', body: data });
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'The bug report was not sent.');
	return body.url as string;
}
