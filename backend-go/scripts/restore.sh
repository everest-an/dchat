#!/usr/bin/env bash
# restore.sh - Restore PostgreSQL database from backup.
#
# Usage: ./restore.sh <backup_file>
# Required env vars: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup_file>"
  echo "Available backups:"
  ls -lt "${BACKUP_DIR:-./backups}"/dchat_*.sql.gz 2>/dev/null | head -10
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "[$(date)] Starting database restore from: $BACKUP_FILE"
echo "WARNING: This will overwrite the current database '$DB_NAME'."
read -p "Continue? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Restore cancelled."
  exit 0
fi

export PGPASSWORD="$DB_PASSWORD"

# Restore from compressed backup.
echo "[$(date)] Restoring database..."
gunzip -c "$BACKUP_FILE" | pg_restore \
  -h "$DB_HOST" \
  -p "${DB_PORT:-5432}" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  2>&1

echo "[$(date)] Database restore completed successfully"
