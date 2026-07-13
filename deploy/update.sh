#!/usr/bin/env bash
# One-command update for a RenoHub host (e.g. the Raspberry Pi):
# pull the latest code, apply any DB migrations, and restart the service.
#
# Usage:  ./deploy/update.sh
# Run from the repo root. Assumes the layout from deploy/DEPLOY.md
# (backend/.venv exists and the systemd unit is named renovation-api).
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE="${RENOHUB_SERVICE:-renovation-api}"
cd "$REPO_DIR"

echo "▶ Pulling latest code…"
git pull --ff-only

echo "▶ Applying database migrations…"
( cd backend && ./.venv/bin/alembic upgrade head )

echo "▶ Restarting $SERVICE…"
sudo systemctl restart "$SERVICE"

sleep 2
echo -n "▶ Health check: "
curl -fsS http://localhost:8000/api/health && echo
echo "✔ Update complete."
