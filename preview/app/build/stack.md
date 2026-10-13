# Stack

The app is one Node process. The browser is a SvelteKit client. Notes are files in a git clone on the server. There is no separate database.

## UI

| Piece | Role |
|---|---|
| Svelte 5 | Components, using runes (`$state`, `$derived`, `$props`) |
| SvelteKit | Routes, form actions, server `load`, and the API under `src/routes/api` |
| TypeScript | Types for repos, sync status, diffs, and resolve options |
| Vite | Dev server and production build |
| CodeMirror 6 | The editor, with `@codemirror/lang-markdown` |
| marked | Markdown to HTML |
| vite-plugin-pwa | Web app manifest and a service worker that updates itself |

The file page renders markdown on the client while you edit, so the preview tracks the buffer. The public notebook you are reading is rendered on the server at build time: the preview route is prerendered and has client-side routing turned off, which lets nginx serve those pages as files.

## Git and files

[isomorphic-git](https://isomorphic-git.org/) implements clone, fetch, fast-forward, commit, push, and the status matrix inside Node. The HTTP client is `isomorphic-git/http/node`. The server passes Node's `fs` into the library. Clones live in `data/repos/<id>/`.

Two JSON files next to the clones hold app state:

- `data/repos.json` is the list of remotes, ids, and content roots.
- `data/settings.json` holds the author name and email, the git token, the DeepSeek key, the default repo, and favourites.

Both are gitignored. A deploy updates the application code and leaves `data/` in place.

## AI

DeepSeek is called only from the server, so the API key is not sent to the browser. `src/lib/server/ai.ts` posts to the chat-completions endpoint and can require a JSON object. Callers are the convert route and the resolve routes.

## How a request is split

SvelteKit's Node adapter serves the signed-in app. In production, nginx sits in front.

- `/preview` and the built client assets are files. A guest never needs Node to read this notebook.
- `/login`, `/auth/`, and `/logout` are proxied to Node, with a tighter rate limit.
- Any other path reaches Node only when the session cookie is present. Guests are redirected to `/preview`. `/api/` without a cookie returns 401.

The session is an HMAC of the email and an expiry, signed with `AUTH_SECRET`, in an HTTP-only cookie. Google is used to learn the email. The email must appear in `ALLOWED_EMAILS` or the callback sends the visitor back here.

## What is intentionally absent

- No test runner is configured. `npm run check` is `svelte-check`.
- No SQL database. If it is not a file in the clone or a field in those two JSON files, the app does not store it.
- No git binary. Anything git must do is a function in `src/lib/server/git.ts`, which is why a few ordinary git operations are missing on purpose. That is the subject of [Challenges](challenges.md).
