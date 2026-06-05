#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# THS-THM Database Backup Script
# Automated PostgreSQL backup with retention policy
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/ths-thm}"
DB_CONTAINER="${DB_CONTAINER:-ths-thm-db}"
DB_NAME="${DB_NAME:-ths_thm_db}"
DB_USER="${DB_USER:-ths_thm}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ═══════════════════════════════════════════════════════════════
# Pre-flight checks
# ═══════════════════════════════════════════════════════════════

if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    error "Database container '${DB_CONTAINER}' is not running"
fi

mkdir -p "$BACKUP_DIR"

# ═══════════════════════════════════════════════════════════════
# Perform backup
# ═══════════════════════════════════════════════════════════════

log "Starting backup: ${DB_NAME} -> ${BACKUP_FILE}"

docker exec "$DB_CONTAINER" \
    pg_dump -U "$DB_USER" -d "$DB_NAME" \
    --format=custom \
    --compress=9 \
    --verbose \
    2>/dev/null | gzip > "$BACKUP_FILE"

# Verify backup
BACKUP_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null || echo "0")
if [ "$BACKUP_SIZE" -lt 100 ]; then
    error "Backup file is too small (${BACKUP_SIZE} bytes) — backup may have failed"
fi

log "Backup complete: $(du -h "$BACKUP_FILE" | cut -f1)"

# ═══════════════════════════════════════════════════════════════
# Cleanup old backups (retention policy)
# ═══════════════════════════════════════════════════════════════

OLD_COUNT=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" | wc -l)
if [ "$OLD_COUNT" -gt 0 ]; then
    find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
    log "Cleaned up $OLD_COUNT old backup(s) (older than ${RETENTION_DAYS} days)"
fi

# ═══════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════

TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

log "Backup directory: ${BACKUP_DIR}"
log "Total backups: ${TOTAL_BACKUPS} (${TOTAL_SIZE})"
log "Retention: ${RETENTION_DAYS} days"
