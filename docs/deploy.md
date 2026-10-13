---
title: Deploy on Oracle Cloud
date: 2026-08-27
tags: [deploy, oracle, vm, github-actions]
---

# Deploy on Oracle Cloud Always Free

Run MD Viewer on an Always Free VM (`VM.Standard.E2.1.Micro`). App listens on port **3000**.

Example host used in setup: `161.33.95.248` — replace with your instance public IP.

## Prerequisites

1. Push the latest app code to GitHub so the VM can clone/pull:

   ```bash
   cd ~/apps/markdown-viewer
   git push
   ```

2. OCI Security List for the VCN: allow TCP **22** (SSH) and **3000** (app).

3. SSH key for the instance (example path below).

## SSH into the VM

```bash
ssh -i ~/Downloads/ssh-key-2026-08-27.key ubuntu@161.33.95.248
```

First time, type `yes` when asked about the fingerprint. You should see a prompt like `ubuntu@md-viewer:~$`.

## First-time install

On the VM:

```bash
curl -fsSL https://raw.githubusercontent.com/aiacuone/md-viewer/master/scripts/install-on-vm.sh -o install-on-vm.sh
bash install-on-vm.sh
```

The script:

- Adds **2G swap** (needed for `npm` build on 1GB RAM)
- Installs **Node 22** and git
- Clones/updates the app to `~/md-viewer`
- Runs `npm ci` and `npm run build`
- Installs and starts a **systemd** service `md-viewer`
- Opens port **3000** in iptables when possible

Open: **http://161.33.95.248:3000**

If `curl` cannot fetch the script (push not on GitHub yet), copy it from your laptop:

```bash
scp -i ~/Downloads/ssh-key-2026-08-27.key \
  ~/apps/markdown-viewer/scripts/install-on-vm.sh \
  ubuntu@161.33.95.248:~/
ssh -i ~/Downloads/ssh-key-2026-08-27.key ubuntu@161.33.95.248
bash install-on-vm.sh
```

## Auto-deploy (GitHub Actions)

After the first-time install, every push to **`master`** can rebuild and restart the app on the VM via SSH.

### 1. Create a deploy SSH key (on your laptop)

Prefer a **dedicated** key (do not reuse your personal login key if you can avoid it):

```bash
ssh-keygen -t ed25519 -C "md-viewer-github-deploy" -f ~/.ssh/md-viewer-deploy -N ""
```

### 2. Install the public key on the VM

```bash
ssh -i ~/Downloads/ssh-key-2026-08-27.key ubuntu@161.33.95.248 \
  'mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys' \
  < ~/.ssh/md-viewer-deploy.pub
```

Confirm passwordless login with the deploy key:

```bash
ssh -i ~/.ssh/md-viewer-deploy ubuntu@161.33.95.248 'echo ok'
```

### 3. Add GitHub Actions secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | `161.33.95.248` (your public IP) |
| `DEPLOY_USER` | `ubuntu` |
| `DEPLOY_SSH_KEY` | Full contents of `~/.ssh/md-viewer-deploy` (private key, including `BEGIN` / `END` lines) |

SSH uses port **22** (edit `.github/workflows/deploy.yml` if you use a different port).

### 4. Push (or run manually)

- Push to `master` → workflow **Deploy to Oracle VM** runs automatically.
- Or: **Actions → Deploy to Oracle VM → Run workflow**.

The job SSHs in and runs [`scripts/deploy-on-vm.sh`](../scripts/deploy-on-vm.sh) (`git fetch` / reset to `origin/master` → `npm ci` → `npm run build` → `systemctl restart md-viewer`). `data/` is preserved.

Build on the micro shape can take several minutes; the workflow allows up to **30 minutes**.

## Manual update (fallback)

On the VM:

```bash
bash ~/md-viewer/scripts/deploy-on-vm.sh
```

Or step by step:

```bash
cd ~/md-viewer
git pull
npm ci
npm run build
sudo systemctl restart md-viewer
sudo systemctl status md-viewer
```

## Checks and logs

```bash
sudo systemctl status md-viewer
journalctl -u md-viewer -f
```

On GitHub: **Actions** tab → latest **Deploy to Oracle VM** run.

Confirm Security List still allows TCP **22** and **3000**, and that the public IP has not changed (Always Free public IPs can change if the instance is terminated and recreated).

## Public preview and Google sign-in

The public site is a static preview. The real app opens only after Google sign-in, and only when that email is listed on the VM. Google will not accept `http://161.33.95.248:3000` as a redirect, so this needs a hostname and HTTPS.

### 1. Hostname

Point a DNS name (for example `md.example.com`) at the VM. Put Cloudflare in front of it (orange-cloud proxy) so a traffic spike is dropped before it reaches the 1GB instance. In the OCI Security List, allow TCP **80** and **443**. After nginx is working, stop allowing public TCP **3000**.

### 2. Secrets file

On the VM, as root:

```bash
sudo tee /etc/md-viewer.env >/dev/null <<'EOF'
PUBLIC_ORIGIN=https://md.example.com
AUTH_SECRET=replace-with-a-long-random-string
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
ALLOWED_EMAILS=you@gmail.com
ADDRESS_HEADER=X-Forwarded-For
XFF_DEPTH=1
PROTOCOL_HEADER=X-Forwarded-Proto
HOST_HEADER=X-Forwarded-Host
EOF
sudo chmod 600 /etc/md-viewer.env
```

Create a Google OAuth **Web** client. Set the authorized redirect URI to `https://md.example.com/auth/callback/google` and the JavaScript origin to `https://md.example.com`.

`AUTH_SECRET` is only used to sign the session cookie. Generate one with `openssl rand -base64 32`.

The systemd unit must load that file. New installs from [`scripts/install-on-vm.sh`](../scripts/install-on-vm.sh) already include `EnvironmentFile=-/etc/md-viewer.env`. On an existing VM, add that line under `[Service]` in `/etc/systemd/system/md-viewer.service`, then:

```bash
sudo systemctl daemon-reload
sudo systemctl restart md-viewer
```

After nginx is the public listener, set `HOST=127.0.0.1` in the unit so Node is not reachable from the internet.

### 3. Add someone to the allow list

Edit the one line in `/etc/md-viewer.env`:

```bash
ALLOWED_EMAILS=you@gmail.com,someone@gmail.com
```

Then `sudo systemctl restart md-viewer`. No git change and no rebuild. The address must be the email Google returns for that account. Anyone else is sent back to the preview and does not get a session.

### 4. Nginx in front of Node

Install nginx and certbot (or a Cloudflare origin certificate), then install [`deploy/nginx-md-viewer.conf`](../deploy/nginx-md-viewer.conf):

- `/preview` and `/_app/` are files under `~/md-viewer/build`. A request is rate-limited and does not reach Node.
- `/login`, `/auth/`, and `/logout` are proxied to `127.0.0.1:3000`, with a tighter rate limit.
- Other paths reach Node only when the `md_session` cookie is present. Guests are redirected to `/preview`. `/api/` without a cookie returns 401.

Replace `md.example.com` in the config, enable the site, and reload nginx. Confirm `https://md.example.com/preview` loads, and that `http://YOUR_IP:3000` no longer answers from outside.

## Notes

- App data (clones + PATs) lives under `~/md-viewer/data/` on the VM — back it up separately; it is not in git.
- Service env: `HOST=0.0.0.0` until nginx is in front, then `HOST=127.0.0.1`. `PORT=3000`, `NODE_ENV=production`. Google and allow-list values live in `/etc/md-viewer.env`, not in git.
- Install: [`scripts/install-on-vm.sh`](../scripts/install-on-vm.sh). Update: [`scripts/deploy-on-vm.sh`](../scripts/deploy-on-vm.sh).
- Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).
- OCI `ubuntu` usually has passwordless `sudo` (needed for `systemctl restart`).
