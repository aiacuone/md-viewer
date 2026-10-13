# Browse and edit

The signed-in app is a folder browser on top of a clone, and an editor on top of one markdown file.

## Browsing

The repo page lists directories first, then markdown files. Names drop a trailing `.md` in the label; the path on disk keeps it. Folders sit in a card. Files sit under the card. A star pins an entry. Pinned entries sort above the rest, and the pin is remembered in app settings for that repo id.

A breadcrumb walks back up the folder. Home is the repo list. The repo name is the root of that clone. Each further crumb is a path segment, shown with the same display name as the tree.

If the repo was added with a content root, the tree starts in that subdirectory. A README that lives at the git root, outside that subdirectory, is still listed, under a path prefixed with `@root`. That exception exists so a monorepo can hide its code and still show its readme. Paths are resolved on the server and rejected if they escape the content root or, for `@root`, the clone.

Empty directories and non-markdown files are omitted. The preview you are in uses the same rule: only `.md` files and folders appear.

## Opening a file

The file page has two views.

- **Preview** renders HTML from the current buffer. Leading YAML front matter is removed first, so a `---` block does not become a horizontal rule and a paragraph of keys.
- **Edit** is CodeMirror with the markdown language mode. Save is Cmd/Ctrl+S as well as the button.

Save sends the path and the buffer to `PUT /api/repos/:id/file`. The server writes that path inside the clone. It does not commit. The page then treats the buffer as clean and reloads server data.

The status line distinguishes the two layers: "Unsaved buffer" while the editor differs from what was last saved, and "Saved to working tree" once it matches. The working tree can still differ from the last commit. That second difference is what the diff and the commit dialog are about.

## Diff and revert

The diff control loads the saved file against `HEAD` for that path. If the buffer is dirty, the page can also show a unified diff of the buffer against the saved text, computed in the browser with the same diff helper the server uses.

From the diff you can discard unsaved edits, which restores the buffer to the saved working tree, or revert the file to the last commit, which loads `GET` with `ref=HEAD` into the buffer. Revert does not write until you save.

## Delete

Delete removes the markdown file from the working tree. A favourite pointing at that path is dropped so the star does not survive the file. The deletion is still uncommitted until you commit it.

## Links inside the preview

Relative links that end in `.md` or `.markdown` are rewritten to an in-app URL. In a signed-in repo that is `/repos/:id/file?path=...`. In this preview it is `/preview/...` with the extension removed. A link that starts with `http:`, `https:`, `mailto:`, or `tel:` is left alone and opened in a new tab. A `#fragment` on the same page is left alone.

That rewriting is why [Sync](sync.md) and [Why it works](../../markdown/why-it-works.md) open as pages rather than as file downloads.

Editing itself is disabled in this preview. The editor, the save button, and the diff are visible on a file page so the layout matches the signed-in app, and they do not run.
