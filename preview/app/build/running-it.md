# Running it

Locally, the app is a Vite dev server.

```bash
npm install
npm run dev
```

`npm run check` runs the SvelteKit type check. `npm run build` produces the Node server under `build/`, and `npm start` runs it. The public preview pages are generated during that build, because the preview route is prerendered from the `preview/` folder.

## Settings the server needs

On a signed-in server, Settings in the UI stores the git author, the personal access token, and the DeepSeek key. Those values go to `data/settings.json`. They are not environment variables, and they are not committed.

Sign-in is separate, and it *is* environment:

| Variable | Role |
|---|---|
| `PUBLIC_ORIGIN` | Hostname used in the Google redirect, including `https://` |
| `AUTH_SECRET` | HMAC key for the session cookie |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | The OAuth web client |
| `ALLOWED_EMAILS` | Comma-separated Google emails that may sign in |
| `ADDRESS_HEADER`, `XFF_DEPTH`, `PROTOCOL_HEADER`, `HOST_HEADER` | So the app trusts the proxy's forwarded headers |

An empty allow list or a missing secret admits nobody. The OAuth callback URL is `${PUBLIC_ORIGIN}/auth/callback/google`.

## The small VM

Production is an Always Free Oracle micro instance: one gigabyte of RAM, so the install adds swap before it builds. Node 22, a systemd unit named `md-viewer`, and a checkout of this repo are what the install script sets up. The process listens on port 3000. After nginx is in front, that listen address is loopback only.

A push to `master` can deploy. The GitHub Action SSHs to the VM and runs the deploy script: fetch, reset to `origin/master`, `npm ci`, `npm run build`, restart the service. The job is allowed a long time because the build swaps. `data/` is left in place, which is where the clones and `settings.json` live. That directory is the one to back up. It is not in git.

nginx then does three jobs.

- Serves `/preview` and the built assets from disk, with a rate limit, without waking Node.
- Proxies login and the Google callback to Node, with a tighter limit.
- Proxies every other path only when the session cookie is present. Guests are sent to `/preview`. API calls without a cookie get 401.

Port 3000 should not stay open on the public security list once that works. The certificate is for the hostname, not for the raw IP, because that is what Google will redirect to.

## The PWA

The Vite build also emits a web app manifest: name "MD Viewer", standalone display, dark background `#0e1014`. The service worker is registered to update itself when a new build is published. Installing the site is optional. The preview and the signed-in app are the same origin, so the installed icon opens whichever one your session allows.

## What a visitor sees from here

You are on the static side of that split. The folders under this page are the notes. The signed-in side is the same layout with the buttons wired up, a real clone, and the sync rules in [Challenges](challenges.md).

Back to the start: [Welcome](../../welcome.md).
