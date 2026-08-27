# MD Viewer

SvelteKit PWA for browsing and editing markdown files in git repositories.

## Features

- Add / remove HTTPS git remotes (optional content root for monorepos)
- Browse folders and open `.md` files
- Edit with CodeMirror, preview with marked
- Save → Commit + push (with diffs); Pull separately
- PAT stored server-side per repo

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

Configure commit author under **Settings**. Clones are stored in `data/repos/` (gitignored).

## Scripts

- `npm run dev` — development server
- `npm run build` — production build (Node adapter)
- `npm run preview` — preview production build
