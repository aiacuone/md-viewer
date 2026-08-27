#!/usr/bin/env bash
# Run ON the Oracle VM (or via GitHub Actions SSH).
# Updates app code from origin/master, rebuilds, restarts systemd.
# Preserves ~/md-viewer/data/ (gitignored clones + tokens).
# Usage: bash ~/md-viewer/scripts/deploy-on-vm.sh
set -euo pipefail

APP_DIR="${APP_DIR:-${HOME}/md-viewer}"
BRANCH="${BRANCH:-master}"

if [[ ! -d "${APP_DIR}/.git" ]]; then
  echo "ERROR: ${APP_DIR} is not a git clone. Run scripts/install-on-vm.sh first."
  exit 1
fi

cd "${APP_DIR}"

echo "==> Fetching origin/${BRANCH}"
git fetch origin
git reset --hard "origin/${BRANCH}"

mkdir -p data

echo "==> Installing dependencies + building"
npm ci
npm run build

echo "==> Restarting md-viewer"
sudo systemctl restart md-viewer.service
sudo systemctl --no-pager status md-viewer.service || true

echo
echo "Deployed $(git rev-parse --short HEAD) on ${BRANCH}"
