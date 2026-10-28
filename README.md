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

Visits to the public preview (`/preview/...`) are counted by the self-hosted Umami on the shared Shtrong VM, dashboard at https://stats-aiacuone.duckdns.org. They go to the portfolio's Umami website with paths reported as `/md-viewer/preview/...` so they stay apart from the portfolio's own pages. The snippet is in `src/routes/preview/+layout.svelte`; the signed-in app is not tracked. Umami sets no cookies and `localhost` is skipped.

## Bug reports

Settings has a **Report a bug** section, shown only to the owner. It files an issue in the private repo `aiacuone/bugs`, labelled with this app's name. An attached photo is shrunk in the browser, committed to `screenshots/<app>/` in that repo, and linked from the issue, because GitHub's issues API takes no uploads. The code is in `src/lib/server/bug-report.ts`, `src/lib/bug-report.ts`, `src/routes/api/bug-report/+server.ts` and `src/lib/components/BugReport.svelte`.

It stays hidden until these are set in `/etc/md-viewer.env`:

| Variable | Value |
|---|---|
| `BUG_REPORT_EMAIL` | The only sign-in email that sees the form and may file |
| `BUG_REPORT_TOKEN` | Fine-grained GitHub token for `aiacuone/bugs` only, with Contents and Issues set to read and write |
| `BUG_REPORT_REPO` | Optional, defaults to `aiacuone/bugs` |
