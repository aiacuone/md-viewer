# Browse and edit

The signed-in app is a folder browser over a clone, and an editor for one markdown file.

## Browsing

Directories are listed first, then markdown files. Labels drop a trailing `.md`; the path on disk keeps it. A star pins an entry. Pinned entries sort first, and the pin is stored in app settings for that repo.

The breadcrumb walks back up. Home is the repo list, the repo name is the clone root, and each further crumb is a path segment.

A content root starts the tree in a subdirectory. A README at the git root, outside that subdirectory, is still listed under `@root`, so a monorepo can hide its code and still show its readme. The server rejects paths that escape the content root or, for `@root`, the clone.

Empty directories and non-markdown files are omitted. This preview uses the same rule.

## Opening a file

- **Preview** renders the current buffer. Leading YAML front matter is stripped first, so a `---` block does not become a rule.
- **Edit** is CodeMirror. Save is the button or Cmd/Ctrl+S.

Save sends the buffer to `PUT /api/repos/:id/file`. The server writes the path inside the clone and does not commit. "Unsaved buffer" means the editor differs from the last save. "Saved to working tree" means it matches. The tree can still differ from the last commit, which is what the diff and the commit dialog show.

## Diff, revert, delete

The diff compares the saved file with `HEAD`. A dirty buffer can also be diffed against the saved text in the browser. Discard restores the buffer to the saved tree. Revert loads `HEAD` into the buffer and does not write until you save.

Delete removes the file from the working tree and drops a favourite for that path. The deletion stays uncommitted until you commit it.

## Links

Relative links ending in `.md` or `.markdown` become in-app URLs: `/repos/:id/file?path=...` when signed in, and `/preview/...` here, with the extension removed. `http:`, `https:`, `mailto:`, and `tel:` links open in a new tab. A `#fragment` on the same page is left alone.

That is why [Sync](sync.md) and [Why it works](../../markdown/why-it-works.md) open as pages. Editing is disabled in this preview. The editor, save, and diff stay visible so the layout matches the signed-in app.
