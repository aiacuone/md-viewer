#!/usr/bin/env bash
# Run ON the Oracle VM as ubuntu (after SSH).
# Usage: bash install-on-vm.sh
set -euo pipefail

APP_DIR="${HOME}/md-viewer"
REPO_URL="${REPO_URL:-https://github.com/aiacuone/md-viewer.git}"
PORT="${PORT:-3000}"

echo "==> Adding swap (needed on 1GB RAM for npm build)"
if ! swapon --show | grep -q .; then
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  fi
fi

echo "==> Installing Node 22"
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git

echo "==> Cloning / updating app"
if [[ -d "${APP_DIR}/.git" ]]; then
  git -C "${APP_DIR}" fetch origin
  git -C "${APP_DIR}" reset --hard origin/master
else
  git clone "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"
mkdir -p data

echo "==> Installing dependencies + building"
npm ci
npm run build

echo "==> Installing systemd service"
sudo tee /etc/systemd/system/md-viewer.service >/dev/null <<EOF
[Unit]
Description=MD Viewer
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=HOST=0.0.0.0
Environment=PORT=${PORT}
Environment=NODE_OPTIONS=--max-old-space-size=384
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now md-viewer.service

echo "==> Opening port ${PORT} in iptables (OCI Ubuntu often needs this)"
sudo iptables -I INPUT -p tcp --dport "${PORT}" -j ACCEPT || true
sudo netfilter-persistent save 2>/dev/null || sudo apt-get install -y iptables-persistent || true

echo
echo "Done. Service status:"
sudo systemctl --no-pager status md-viewer.service || true
echo
echo "Open: http://$(curl -s ifconfig.me 2>/dev/null || echo YOUR_PUBLIC_IP):${PORT}"
echo "Also allow TCP ${PORT} in OCI Security List if not already open."
