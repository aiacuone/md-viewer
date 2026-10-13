# What it is

MD Viewer is a personal workspace for markdown that already lives in a git repository. You add an HTTPS remote, the server clones it, and the browser becomes the way you browse folders, edit files, and send commits back.

It is not a hosted notes product. There is no account database of documents. The notes are the clone on disk. The app adds a UI, a sync flow, and two DeepSeek features: turning a paste into markdown, and suggesting a way through when two git histories have diverged.

The public site you are reading is the preview of that UI. It is prerendered from the files in the `preview/` directory of the app repo. The buttons are the real buttons, and they do nothing until a signed-in session exists.

## What you can do once signed in

- Add and remove HTTPS remotes. A repo can point at a content root, so a monorepo can show only the notes folder.
- Browse folders. Markdown files and directories are listed; other files are skipped. A README at the git root stays reachable even when the content root is a subfolder.
- Open a file in preview or in a CodeMirror editor. Save writes the working tree. A dot marks an unsaved buffer.
- Read a diff of the unsaved buffer, or of the saved file against the last commit. Revert the file to that commit.
- Delete a file from the working tree.
- Commit and push, or pull and push separately. Pull fast-forwards. It does not start a merge.
- Pin a file or folder. Favourites sort to the top. They are stored with the app settings, not in the notes repo.
- Paste rough notes and ask DeepSeek to turn them into a markdown file in the current folder, then adjust the wording.
- If local and remote both have commits the other lacks, ask DeepSeek for a resolve: keep the remote, keep this device, or merge the two sides.

Each of those is written up under [features](features/browse-and-edit.md). How the program is put together is [Stack](build/stack.md). What was hard is [Challenges](build/challenges.md).

## What it will not do

- It will not edit arbitrary binary files, or list every file in the repo. The tree is markdown and folders.
- It will not pull over a dirty working tree, and it will not silently merge diverged branches.
- It will not sign in anyone whose Google email is absent from the allow list on the server.
- It does not store the git token or the DeepSeek key in the repository. Those sit in `data/settings.json` on the server.

## How this preview relates

The pages under `markdown/` are here so a visitor can see the format before signing in. Start with [Why it works](../markdown/why-it-works.md) or the longer [A long note](../markdown/long-note.md). The map of the whole notebook is [Welcome](../welcome.md).
