# What it is

MD Viewer browses and edits markdown that already lives in a git repo. You add an HTTPS remote, the server clones it, and the browser is how you read, edit, and commit.

There is no document database. The notes are the clone on disk. The app adds the UI, sync, and two DeepSeek features: turning a paste into markdown, and suggesting a resolve when two histories diverge.

This site is a preview of that UI, built from the files in `preview/`. The controls are the real ones, and they stay inactive until you sign in.

## Once signed in

- Add HTTPS remotes. A content root can show only a notes folder inside a monorepo. A README at the git root stays reachable.
- Browse folders. Only markdown files and directories are listed.
- Preview a file, or edit it in CodeMirror. Save writes the working tree. A dot marks an unsaved buffer.
- Diff unsaved edits, or the saved file against the last commit, and revert to that commit.
- Delete a file from the working tree. The deletion stays uncommitted until you commit it.
- Commit and push, or pull and push separately. Pull only fast-forwards.
- Pin a file or folder. Favourites are stored with app settings, not in the notes repo.
- Paste rough notes and have DeepSeek turn them into a markdown file, then edit the result.
- If local and remote have each moved ahead, ask DeepSeek whether to keep the remote, keep this device, or merge.

Each of those is under [features](features/browse-and-edit.md). The build is [Stack](build/stack.md). The hard parts are [Challenges](build/challenges.md).

## Limits

- It lists markdown and folders only. It does not edit other files.
- It will not pull over a dirty working tree, or merge diverged branches on its own.
- Sign-in is limited to Google emails on the server allow list.
- The git token and the DeepSeek key stay in `data/settings.json`, not in the repo.

## This preview

The pages under `markdown/` show the format before you sign in. Start with [Why it works](../markdown/why-it-works.md) or [A long note](../markdown/long-note.md). The map of the notebook is [Welcome](../welcome.md).
