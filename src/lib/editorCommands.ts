import { EditorSelection, type ChangeSpec, type EditorState, type StateCommand } from '@codemirror/state';

/** Distinct lines touched by the selection (a range ending at a line start excludes that line). */
function selectedLines(state: EditorState) {
	const seen = new Set<number>();
	const lines = [];
	for (const range of state.selection.ranges) {
		const first = state.doc.lineAt(range.from).number;
		const last = state.doc.lineAt(range.empty ? range.to : range.to - 1).number;
		for (let n = first; n <= last; n++) {
			if (seen.has(n)) continue;
			seen.add(n);
			lines.push(state.doc.line(n));
		}
	}
	return lines;
}

/** Apply `edit` to each selected line; it returns a change relative to the line start, or null. */
function editLines(edit: (text: string) => { from: number; to: number; insert: string } | null): StateCommand {
	return ({ state, dispatch }) => {
		const changes: ChangeSpec[] = [];
		for (const line of selectedLines(state)) {
			const change = edit(line.text);
			if (change) {
				changes.push({ from: line.from + change.from, to: line.from + change.to, insert: change.insert });
			}
		}
		if (changes.length === 0) return false;
		const changeSet = state.changes(changes);
		// assoc 1 moves a cursor sitting at the insert point past the new marker, e.g. on an empty line.
		const selection = state.selection.map(changeSet, 1);
		dispatch(state.update({ changes: changeSet, selection, userEvent: 'input', scrollIntoView: true }));
		return true;
	};
}

const INDENT = /^\s*/;
const BULLET = /^(\s*)[-*+] (\[[ xX]\] )?/;
const CHECKBOX = /^(\s*)[-*+] \[[ xX]\] /;
const HEADING = /^(#{1,6}) /;

/** none → # → ## → ### → none. */
export const cycleHeading = editLines((text) => {
	const match = HEADING.exec(text);
	if (!match) return { from: 0, to: 0, insert: '# ' };
	const level = match[1].length;
	return { from: 0, to: match[0].length, insert: level < 3 ? `${'#'.repeat(level + 1)} ` : '' };
});

export const toggleBullet = editLines((text) => {
	const match = BULLET.exec(text);
	if (match) return { from: match[1].length, to: match[0].length, insert: '' };
	const indent = INDENT.exec(text)![0].length;
	return { from: indent, to: indent, insert: '- ' };
});

export const toggleCheckbox = editLines((text) => {
	const checkbox = CHECKBOX.exec(text);
	if (checkbox) return { from: checkbox[1].length, to: checkbox[0].length, insert: '' };
	const bullet = BULLET.exec(text);
	if (bullet) return { from: bullet[0].length, to: bullet[0].length, insert: '[ ] ' };
	const indent = INDENT.exec(text)![0].length;
	return { from: indent, to: indent, insert: '- [ ] ' };
});

/** Wrap the selection in `mark`, or unwrap it when already wrapped. An empty selection puts the cursor between the marks. */
export function toggleWrap(mark: string): StateCommand {
	return ({ state, dispatch }) => {
		const len = mark.length;
		const spec = state.changeByRange((range) => {
			const before = state.sliceDoc(Math.max(0, range.from - len), range.from);
			const after = state.sliceDoc(range.to, range.to + len);
			if (before === mark && after === mark) {
				return {
					changes: [
						{ from: range.from - len, to: range.from },
						{ from: range.to, to: range.to + len }
					],
					range: EditorSelection.range(range.from - len, range.to - len)
				};
			}
			return {
				changes: [
					{ from: range.from, insert: mark },
					{ from: range.to, insert: mark }
				],
				range: EditorSelection.range(range.from + len, range.to + len)
			};
		});
		dispatch(state.update(spec, { userEvent: 'input', scrollIntoView: true }));
		return true;
	};
}
