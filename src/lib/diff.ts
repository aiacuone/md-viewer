export type ParsedDiffLine = {
	type: 'header' | 'remove' | 'add' | 'context';
	text: string;
};

export type DiffStats = {
	added: number;
	removed: number;
};

export function parseDiffText(diff: string): ParsedDiffLine[] {
	return diff.split('\n').map((line) => {
		if (line.startsWith('---') || line.startsWith('+++')) {
			return { type: 'header', text: line };
		}
		if (line.startsWith('-')) {
			return { type: 'remove', text: line.slice(1) };
		}
		if (line.startsWith('+')) {
			return { type: 'add', text: line.slice(1) };
		}
		if (line.startsWith(' ')) {
			return { type: 'context', text: line.slice(1) };
		}
		return { type: 'context', text: line };
	});
}

export function diffStats(lines: ParsedDiffLine[]): DiffStats {
	let added = 0;
	let removed = 0;
	for (const line of lines) {
		if (line.type === 'add') added++;
		if (line.type === 'remove') removed++;
	}
	return { added, removed };
}

export function statusLabel(status: 'modified' | 'added' | 'deleted'): string {
	switch (status) {
		case 'added':
			return 'New';
		case 'deleted':
			return 'Deleted';
		default:
			return 'Changed';
	}
}

/** Build a unified diff string from before/after file contents. */
export function unifiedDiff(filepath: string, before: string, after: string): string {
	const a = before.split('\n');
	const b = after.split('\n');
	const lines: string[] = [`--- a/${filepath}`, `+++ b/${filepath}`];
	const max = Math.max(a.length, b.length);
	let i = 0;
	let j = 0;
	while (i < a.length || j < b.length) {
		if (i < a.length && j < b.length && a[i] === b[j]) {
			lines.push(` ${a[i]}`);
			i++;
			j++;
			continue;
		}
		let found = false;
		for (let look = 1; look < 40 && !found; look++) {
			if (i + look < a.length && j < b.length && a[i + look] === b[j]) {
				for (let k = 0; k < look; k++) lines.push(`-${a[i + k]}`);
				i += look;
				found = true;
			} else if (j + look < b.length && i < a.length && a[i] === b[j + look]) {
				for (let k = 0; k < look; k++) lines.push(`+${b[j + k]}`);
				j += look;
				found = true;
			}
		}
		if (!found) {
			if (i < a.length) {
				lines.push(`-${a[i]}`);
				i++;
			}
			if (j < b.length) {
				lines.push(`+${b[j]}`);
				j++;
			}
		}
		if (lines.length > 5000 + max) break;
	}
	return lines.join('\n');
}

export function isMatrixChanged(head: number, workdir: number, stage: number): boolean {
	return !(head === 1 && workdir === 1 && stage === 1);
}

/** Map a diff line index to its position in the current (after) file content. */
function locateAfterLineIndex(
	fileLines: string[],
	diffLines: ParsedDiffLine[],
	targetIndex: number
): number {
	let fileIdx = 0;
	for (let d = 0; d < targetIndex; d++) {
		const dl = diffLines[d];
		if (dl.type === 'header' || dl.type === 'remove') continue;
		while (fileIdx < fileLines.length && fileLines[fileIdx] !== dl.text) {
			fileIdx++;
		}
		if (fileIdx < fileLines.length) fileIdx++;
	}
	return fileIdx;
}

/** Undo one added/removed line from the diff against the current file text. */
export function revertDiffLine(
	content: string,
	diffLines: ParsedDiffLine[],
	lineIndex: number
): string {
	const target = diffLines[lineIndex];
	if (target.type !== 'add' && target.type !== 'remove') return content;

	const fileLines = content.split('\n');

	if (target.type === 'add') {
		const idx = locateAfterLineIndex(fileLines, diffLines, lineIndex);
		if (idx < fileLines.length && fileLines[idx] === target.text) {
			fileLines.splice(idx, 1);
		}
	} else {
		const idx = locateAfterLineIndex(fileLines, diffLines, lineIndex);
		fileLines.splice(idx, 0, target.text);
	}

	return fileLines.join('\n');
}

/** Undo every added/removed line in the diff (reverse order). */
export function revertAllDiffLines(content: string, diff: string): string {
	const diffLines = parseDiffText(diff);
	let next = content;
	const indices = diffLines
		.map((line, index) => ({ line, index }))
		.filter(({ line }) => line.type === 'add' || line.type === 'remove')
		.map(({ index }) => index)
		.reverse();
	for (const index of indices) {
		next = revertDiffLine(next, diffLines, index);
	}
	return next;
}

type DiffSummary = { path: string; status: 'modified' | 'added' | 'deleted' };

function fileLabel(path: string): string {
	const base = path.split('/').pop() ?? path;
	return base.replace(/\.(md|markdown)$/i, '');
}

function changeLine(d: DiffSummary): string {
	const name = fileLabel(d.path);
	if (d.status === 'added') return `Add ${name}`;
	if (d.status === 'deleted') return `Delete ${name}`;
	return `Update ${name}`;
}

/** Simple commit message from changed files (no AI). */
export function suggestCommitMessage(diffs: DiffSummary[]): string {
	if (diffs.length === 0) return '';

	const bullets = diffs.map((d) => `- ${changeLine(d)}`).join('\n');
	return `md-viewer\n\n${bullets}`;
}
