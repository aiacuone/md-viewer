# MD Viewer

SvelteKit PWA for browsing and editing markdown files in git repositories.

## Features

- Add / remove HTTPS git remotes (optional content root for monorepos)
- Browse folders and open `.md` files
- Edit with CodeMirror, preview with marked
- Save → Commit + push (with diffs); Pull / Push separately
- AI sync resolve when histories diverge (DeepSeek)
- Convert (paste notes → AI markdown into a folder/file)
- One personal access token and DeepSeek API key under **Settings**

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

**Live:** https://md-viewer-aiacuone.duckdns.org (Oracle Cloud VM behind nginx — see [docs/deploy.md](docs/deploy.md)). Signed-out visitors see the public preview at `/preview`; the app itself needs Google sign-in with an allow-listed email.

Configure commit author and PAT under **Settings**. Clones are stored in `data/repos/` (gitignored).

## Scripts

- `npm run dev` — development server
- `npm run build` — production build (Node adapter)
- `npm run preview` — preview production build

## Analytics

Visits to the public preview (`/preview/...`) are counted by the self-hosted GoatCounter on the portfolio VM, dashboard at https://stats.portfolio-aiacuone.duckdns.org. Paths are reported as `/md-viewer/preview/...` so they stay apart from the portfolio's own pages. The snippet is in `src/routes/preview/+layout.svelte`; the signed-in app is not tracked. GoatCounter sets no cookies and ignores `localhost`.
