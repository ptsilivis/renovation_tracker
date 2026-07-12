#!/usr/bin/env bash
# Nightly backup for a RenovationHub host: dump the Postgres DB and archive the
# uploads directory, then prune anything older than the retention window.
#
# Usage:   ./deploy/backup.sh
# Cron:    0 3 * * *  cd ~/renovation_tracker && ./deploy/backup.sh >> ~/backups/backup.log 2>&1
#
# Reads DATABASE_URL and UPLOAD_DIR from backend/.env. Tune with env vars:
#   RENOHUB_BACKUP_DIR       (default: ~/backups)
#   RENOHUB_BACKUP_RETENTION (default: 14  — days to keep)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"
BACKUP_DIR="${RENOHUB_BACKUP_DIR:-$HOME/backups}"
RETENTION="${RENOHUB_BACKUP_RETENTION:-14}"

[ -f "$ENV_FILE" ] || { echo "no $ENV_FILE"; exit 1; }
getenv() { grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- ; }

# pg_dump speaks postgresql://… — strip SQLAlchemy's "+psycopg" driver suffix.
DB_URL="$(getenv DATABASE_URL)"
PG_URL="${DB_URL/+psycopg/}"
UPLOAD_DIR="$(getenv UPLOAD_DIR)"; UPLOAD_DIR="${UPLOAD_DIR:-$ROOT/backend/uploads}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%F_%H%M)"

echo "[$(date)] dumping database…"
pg_dump "$PG_URL" | gzip > "$BACKUP_DIR/db_$STAMP.sql.gz"

if [ -d "$UPLOAD_DIR" ]; then
  echo "[$(date)] archiving uploads…"
  tar czf "$BACKUP_DIR/uploads_$STAMP.tgz" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"
fi

echo "[$(date)] pruning backups older than $RETENTION days…"
find "$BACKUP_DIR" -maxdepth 1 -name 'db_*.sql.gz'  -mtime +"$RETENTION" -delete
find "$BACKUP_DIR" -maxdepth 1 -name 'uploads_*.tgz' -mtime +"$RETENTION" -delete

echo "[$(date)] done → $BACKUP_DIR"
ls -lh "$BACKUP_DIR" | tail -4
