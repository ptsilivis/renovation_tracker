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

# Poll the health endpoint — the service can take several seconds to import and
# bind on a slow host, so retry rather than failing on a single early probe.
echo -n "▶ Health check: "
for _ in $(seq 1 20); do
  if curl -fsS http://localhost:8000/api/health; then
    echo; echo "✔ Update complete."; exit 0
  fi
  sleep 1
done

echo
echo "✖ $SERVICE did not answer on :8000 within 20s."
echo "  Inspect it with: sudo systemctl status $SERVICE --no-pager"
echo "               and: sudo journalctl -u $SERVICE -n 60 --no-pager"
exit 1
