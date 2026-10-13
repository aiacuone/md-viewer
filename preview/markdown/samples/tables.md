# Tables

A markdown table is a grid of text. It is not a spreadsheet: the cells are not calculated, and a wide table scrolls rather than reflowing into a chart. Use one when a reader needs to compare a few rows.

The syntax is a header row, a separator row of dashes, and then the body. Colons in the separator are a hint about alignment. This renderer does not depend on them.

## Where a note lives

| Place | What it is | Survives without this app |
|---|---|---|
| The `.md` file in the clone | The note | Yes |
| The git commit | A snapshot of that file | Yes, in any git client |
| `data/settings.json` | Author, token, DeepSeek key, favourites, default repo | No, and it is not in the notes repo |
| The session cookie | Proof that Google sign-in matched the allow list | No |

## What the preview can show

| Construct | In this notebook | Notes |
|---|---|---|
| Headings | [A long note](../long-note.md) | Four levels, used sparingly |
| Lists and tasks | [Lists and tasks](lists-and-tasks.md) | Including nested and checked items |
| Tables | This file | Several, on purpose |
| Code and quotes | [Code and quotes](code-and-quotes.md) | Fences with a language tag |
| Links between notes | Throughout | Relative `.md` paths, rewritten to preview URLs |

## Sync cases

This is the table the pull logic actually branches on. "Clean" means the working tree matches the last commit.

| Ahead | Behind | Clean | What the app does |
|---|---|---|---|
| 0 | 0 | yes | Pull does nothing |
| 0 | > 0 | yes | Fast-forward |
| > 0 | 0 | yes | Pull refuses; push instead |
| > 0 | > 0 | yes | Histories have diverged; choose a resolve |
| any | any | no | Commit or discard before pulling |

The code path is `pullRepo` in `src/lib/server/git.ts`. The write-up is [Sync](../../app/features/sync.md) and the reason pull will not start a merge is [Challenges](../../app/build/challenges.md).
