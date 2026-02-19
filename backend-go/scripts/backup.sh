#!/usr/bin/env bash
# backup.sh - PostgreSQL database backup script with rotation.
#
# Usage: ./backup.sh
# Required env vars: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
# Optional: BACKUP_DIR (default: ./backups), BACKUP_RETENTION_DAYS (default: 30)
#
# Schedule via cron:
#   0 2 * * * /path/to/backup.sh >> /var/log/dchat-backup.log 2>&1

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/dchat_${DB_NAME}_${TIMESTAMP}.sql.gz"

# Ensure backup directory exists.
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."

# Perform pg_dump with gzip compression.
export PGPASSWORD="$DB_PASSWORD"
pg_dump \
  -h "$DB_HOST" \
  -p "${DB_PORT:-5432}" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-privileges \
  --format=custom \
  | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup completed: $BACKUP_FILE ($BACKUP_SIZE)"

# Rotate old backups.
DELETED=$(find "$BACKUP_DIR" -name "dchat_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete -print | wc -l)
echo "[$(date)] Cleaned up $DELETED backup(s) older than $RETENTION_DAYS days"

# Verify backup integrity.
if gzip -t "$BACKUP_FILE" 2>/dev/null; then
  echo "[$(date)] Backup integrity check: PASSED"
else
  echo "[$(date)] WARNING: Backup integrity check FAILED"
  exit 1
fi

echo "[$(date)] Backup script completed successfully"
