# Challenges

The app looks like a thin UI over git. Most of the difficult behaviour is the gap between what a person expects from the `git` command and what a small server can safely do with a pure-JavaScript git implementation, a 1 GB virtual machine, and a public URL.

This page is the long one on that subject. The feature descriptions stay in [Sync](../features/sync.md), [Browse and edit](../features/browse-and-edit.md), and [Convert and resolve](../features/convert.md).

## Git without the git binary

isomorphic-git can clone, commit, fetch, fast-forward, and push. It does not give you a comfortable `git merge` that stops in the middle with conflict markers and an index you can finish later. Leaving a clone in that state would mean the next request has to understand a half-finished merge, and the editor would open files full of `<<<<<<<` lines with no tool to complete them.

So pull does less than the command-line tool.

- A dirty working tree blocks pull. There is no stash step hidden inside the button.
- If the local branch is ahead, pull refuses and says to push. Pull is not "sync everything".
- If each side has commits the other lacks, pull throws `HISTORIES_DIVERGED` and stops.
- The only automatic update is a fast-forward of a clean branch that is strictly behind.

That is stricter than `git pull`. It is also the version that does not surprise a notes app. A fast-forward cannot drop a sentence you wrote on the other machine. A merge can, or it can drop one you wrote here, and a silent merge would do it inside a request.

The status numbers come from the library's status matrix and from comparing the local branch to the fetched remote-tracking ref. Diffs shown in the UI are not `git diff` subprocess output. The app builds a unified diff from the two strings. That keeps the preview of unsaved edits and the preview of saved-versus-HEAD on the same implementation, including in the browser, where there is no git at all.

## Divergence had to be a product decision

Once pull refuses to merge, the app still needs an answer for two machines that each committed. Three answers cover the cases, and each one is explicit about what is destroyed.

**Use the remote.** The server fetches, points the local branch at `origin/<branch>`, and checks that commit out with force. Local-only commits are no longer on the branch. This is the right choice when this device was the one that drifted.

**Keep this device.** Force-push. Remote-only commits are overwritten. The button that does this is not the normal Push button. The dialog asks, and the summary says the remote-only commits will be lost. Normal push still errors on a non-fast-forward with "pull first".

**Merge both.** This is the path that replaces a conflicted merge. The server walks the local tree and the remote tree, collects file paths whose blob ids differ, and ignores paths outside the content root. For each path it can show the local text and the remote text. DeepSeek proposes a resolution. The server writes those files, stages them, and commits with *two parents*: the previous local commit and the remote commit. Later history shows a join, not a rewritten branch that pretends the other side never existed.

The comment in `applyAiMergeAndCommit` describes that commit as joining `origin/<branch>` into the local branch. The working tree must be clean before it runs. The model is instructed not to invent facts. None of that makes the merge correct. It makes the merge a commit you can read, diff, and revert, instead of an index state the next page load does not know how to finish.

If the model is unavailable, the fixed options still include "use remote" and "keep this device". The app does not block on AI to recover a diverged branch. AI is an extra strategy, not the only one.

A related limit: the text sent to the model is truncated. A huge file is not pasted in full. The resolve is a best effort over a bounded view, which is another reason it is a choice and not an automatic pull.

## Authentication is a token, not a login to the git host

The browser never holds the git credential. Settings stores one personal access token on the server. isomorphic-git's `onAuth` returns it as the password, with username `x-access-token`.

That is enough for GitHub, and it is enough for many other HTTPS hosts, but it is one token for every remote. There is no per-repo credential, no SSH key, and no OAuth dance against the git host. Clone and push failures that look like 401 or 403 are rewritten into a single instruction: check the token under Settings. Other failures keep their message.

Clone itself retries once. If you named a default branch that does not exist, the first clone throws, the directory is removed, and a second clone runs without an explicit ref. The branch that is actually checked out is then stored on the repo. That retry exists because the branch name is easy to get wrong and a failed clone should not leave a partial directory as the repo.

## Content root versus the rest of the repository

A content root lets one git repository hold more than notes. The tree the UI walks is `repo + content root + relative path`. `resolveContentPath` rejects a path that escapes that directory.

The exception is the README at the repository root. People expect to open it even when notes live in a subfolder. Those files are exposed under a synthetic prefix, `@root`, and `resolveMarkdownPath` checks that prefix against the clone root instead of the content root. A link inside a normal note and a link inside an `@root` file do not resolve the same way: an absolute-looking path from an `@root` file is interpreted against the repo, and if it points into the content root it is rewritten back into content-root space.

Getting that wrong either hides the README or lets a path climb out of the clone. Both checks are string checks on the resolved path (`target` must equal the base or start with `base + separator`). They are easy to break with a prefix that only *looks* like a parent, which is why the separator is part of the test.

## Links, front matter, and the preview URL

Marked will happily emit whatever `href` the author wrote. For a notes app that is wrong. A relative `other.md` should open the other note, not navigate the browser to a file the static server does not have.

`rewriteHref` handles four cases.

- `http:`, `https:`, `mailto:`, and `tel:` stay external and receive `target="_blank"` and `rel="noopener noreferrer"`.
- A bare `#fragment` stays on the page.
- A path ending in `.md` or `.markdown` is resolved against the current file's directory, normalised so `..` cannot escape, and turned into either `/repos/:id/file?path=` or, in this notebook, `/preview/<path>`.
- Anything else is left as a non-external href. The app does not try to host images or attachments from the repo in this pass.

Front matter is a second parsing problem. A file that starts with `---` is valid YAML to other tools and, if you feed it to a markdown parser untouched, a horizontal rule followed by a paragraph of `title: ...`. `stripFrontMatter` removes one leading block delimited by `---` or `...` before parse. Only a leading block. A horizontal rule later in the file is still a horizontal rule.

The public preview adds a constraint the signed-in app does not have. The route is prerendered. Every folder and every markdown file must be known at build time, which `previewEntryParams` does by walking `preview/` and emitting a path for each directory and each `.md` file with the extension removed. A file added after the build does not exist as a page until the next build. Client-side routing is off, so each open is a full navigation to HTML that already contains the rendered body. That is what allows nginx to serve `/preview` from the build directory without asking Node.

Keeping that preview honest is its own small problem. The disabled buttons are the same components as the real ones, with a `preview` flag, so the layout cannot drift into a separate mock. The short paragraph on the preview home is a string in `src/lib/preview/about.ts`, and the tool names are read from `package.json` at build time. When a visible feature appears or disappears, that paragraph has to change in the same edit. A second, preview-only chrome would mean every UI change happens twice.

## A machine with 1 GB of RAM

The production host is an Oracle Cloud Always Free `VM.Standard.E2.1.Micro`. The install script adds 2 GB of swap because `npm`'s build does not reliably finish in 1 GB. The GitHub Actions deploy allows 30 minutes for that reason. The job SSHs in, resets the app checkout to `origin/master`, runs `npm ci` and `npm run build`, and restarts systemd. It does not touch `data/`.

That split matters. A careless deploy that cleans the whole directory would delete the clones and the token. The workflow and `scripts/deploy-on-vm.sh` update the code and leave `data/` where it is. The copies of the notes on the VM are not in the app's git history. They need their own backup.

Swap makes the build possible. It does not make it quick, and it does not make a memory leak in the request path acceptable. The process is one Node server. Git operations run inside the request that asked for them. A large fetch is a slow request, not a background worker. The app is sized for a personal notebook, not for a repository with a long binary history.

## Sign-in could not be the raw IP

Google's OAuth redirect rejects `http://<ip>:3000`. The public app needs a hostname and HTTPS. The deploy notes use a DuckDNS name, nginx, and a certificate, and they tell you to stop publishing port 3000 once nginx is the listener. Node then binds to `127.0.0.1`.

nginx also encodes the preview-versus-app split. Static preview paths are rate-limited and never reach Node. Login and the OAuth callback are proxied with a tighter limit. Everything else requires the session cookie. That means a crawler or a stranger can read this notebook and cannot call `/api/repos`.

The allow list is a comma-separated env var, `ALLOWED_EMAILS`. Adding a person is an edit to that file and a restart, not a code change. The callback compares the Google email using the same HMAC secret that signs the session, so a missing secret or an empty list fails closed: nobody is signed in.

The cookie lasts 14 days, is HTTP-only, and is `Secure` when the public origin is HTTPS. `PUBLIC_ORIGIN` has to match the hostname Google redirects to, because the app may be behind a proxy and must not trust the incoming Host blindly when building the redirect URI.

## Two screens, one set of actions

The same file actions exist twice in the layout: a row in the header for a wide window, and a fixed bar at the bottom for a narrow one. It is easy for one of them to grow a button the other does not have. The actions are one component with a `part` so the header, the tool row, and the mobile bar are the same buttons. The preview passes `preview` and the signed-in page passes the real handlers.

Back is the other split. On a wide screen it sits beside the title and uses the browser history, falling back to the parent route. On a narrow screen it is the first control in the bottom bar. The preview file page has that bar. The preview folder list did not originally share the repo list's padding, so a folder label sat on the card's border while a file label sat on the page edge. The list styles have to match the signed-in repo page, including not zeroing the card's own padding when the class that clears list padding is applied to the card.

## What was left unfinished on purpose

A few absences are decisions rather than forgotten work.

- No SSH remotes. HTTPS and one token keep the server free of key files.
- No merge from the Pull button. The three resolve strategies are the merge UI.
- No collaborative cursors. Two people use two clones and git.
- No attachment hosting. The renderer rewrites markdown links and does not try to be a file server for the rest of the repo.
- No automated test suite. The check script is the type checker. Regressions in path resolution and in pull's branch matrix are the kind of bug a test would lock, and they are currently locked only by reading `git.ts` and `paths.ts`.

The format those limits protect is described without the program in [Why it works](../../markdown/why-it-works.md). How the finished app is actually started on the VM is [Running it](running-it.md).
