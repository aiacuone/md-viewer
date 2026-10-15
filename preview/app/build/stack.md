# Stack

One Node process. The browser is a SvelteKit client. Notes are files in a git clone. There is no separate database.

## UI

| Piece | Role |
|---|---|
| Svelte 5 | Components, using runes |
| SvelteKit | Routes, form actions, server `load`, and `src/routes/api` |
| TypeScript | Types for repos, sync, diffs, and resolve options |
| Vite | Dev server and production build |
| CodeMirror 6 | Editor, with the markdown language mode |
| marked | Markdown to HTML |
| vite-plugin-pwa | Manifest and a service worker that updates itself |

While you edit, the file page renders markdown in the browser. This notebook is rendered at build time: the preview route is prerendered, so nginx can serve it as files.

## Git and files

[isomorphic-git](https://isomorphic-git.org/) does clone, fetch, fast-forward, commit, push, and status inside Node. Clones live in `data/repos/<id>/`.

Two gitignored JSON files hold app state, and a deploy leaves `data/` in place:

- `data/repos.json` lists remotes, ids, and content roots.
- `data/settings.json` holds the author, git token, DeepSeek key, default repo, and favourites.

## AI

DeepSeek is called only from the server, so the key never reaches the browser. The AI routes are paste-to-markdown and resolve.

## Requests

nginx sits in front of SvelteKit's Node adapter.

- `/preview` and the built client assets are files. A guest can read this notebook without Node.
- `/login`, `/auth/`, and `/logout` are proxied, with a tighter rate limit.
- Welcome and sign-in reach Node. Other pages need a session, and guests are sent to `/welcome`. `/api/` without a cookie returns 401.

The session is an HMAC of the email and an expiry, signed with `AUTH_SECRET`, in an HTTP-only cookie. Google supplies the email. It must be in `ALLOWED_EMAILS`.

## Left out on purpose

- No test runner. `npm run check` is `svelte-check`.
- No SQL. State is a file in the clone or a field in those two JSON files.
- No git binary. Git operations are functions in `src/lib/server/git.ts`, which is why a few ordinary ones are missing. See [Challenges](challenges.md).
