#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# THS-THM Database Backup Script
# Automated PostgreSQL backup with retention, offsite sync,
# health verification, and Slack notification on failure.
#
# Designed to run via systemd timer (daily) or cron.
#
# Usage:
#   ./scripts/backup-database.sh                    # production
#   TARGET=staging ./scripts/backup-database.sh     # staging
#   ./scripts/backup-database.sh --help
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── Help ─────────────────────────────────────────────────────
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  cat <<'HELP'
Usage: backup-database.sh [OPTIONS]

Backup PostgreSQL database from a Docker container with retention,
offsite sync, and optional Slack notification.

Environment variables:
  TARGET           "production" (default) or "staging"
  BACKUP_DIR       Local backup directory (default: /opt/backups/ths-thm)
  RETENTION_DAYS   Days to keep local backups (default: 30)
  OFFSITE_HOST     Optional: rsync/SSH host for offsite backup
  OFFSITE_DIR      Optional: remote directory for offsite backup
  OFFSITE_KEY      Optional: SSH key path for offsite sync
  SLACK_WEBHOOK_URL Optional: Slack webhook for failure notification
  DB_PASSWORD      Database password (read from .env if not set)

Options:
  --production     Backup production database (default)
  --staging        Backup staging database
  --dry-run        Show what would be done without doing it
  --offsite-only   Only sync existing backups to offsite, skip pg_dump
  -h, --help       Show this help
HELP
  exit 0
fi

# ── Configuration ─────────────────────────────────────────────
TARGET="${TARGET:-production}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/ths-thm}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)
HOSTNAME=$(hostname -s 2>/dev/null || echo "vps")

# Parse arguments
DRY_RUN=false
OFFSITE_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --production) TARGET=production ;;
    --staging)    TARGET=staging ;;
    --dry-run)    DRY_RUN=true ;;
    --offsite-only) OFFSITE_ONLY=true ;;
  esac
done

# Container & DB config based on target
case "$TARGET" in
  production)
    DB_CONTAINER="${DB_CONTAINER:-ths-thm-db}"
    DB_NAME="${DB_NAME:-ths_thm_db}"
    DB_USER="${DB_USER:-ths_thm}"
    ENV_DIR="/opt/ths-thm"
    BACKUP_SUBDIR="${BACKUP_DIR}/production"
    ;;
  staging)
    DB_CONTAINER="${DB_CONTAINER:-ths-thm-staging-db}"
    DB_NAME="${DB_NAME:-ths_thm_staging}"
    DB_USER="${DB_USER:-ths_thm_staging}"
    ENV_DIR="/opt/ths-thm-staging"
    BACKUP_SUBDIR="${BACKUP_DIR}/staging"
    ;;
  *)
    echo "❌ Unknown target: $TARGET (use --production or --staging)"
    exit 1
    ;;
esac

BACKUP_FILE="${BACKUP_SUBDIR}/${DB_NAME}_${DATE}.sql.gz"
BACKUP_INFO="${BACKUP_SUBDIR}/${DB_NAME}_${DATE}.info.json"

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error(){ echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[i]${NC} $1"; }

# ── Pre-flight ───────────────────────────────────────────────
mkdir -p "$BACKUP_SUBDIR"

if [ "$OFFSITE_ONLY" = false ]; then
  if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    error "Database container '${DB_CONTAINER}' is not running"
  fi    # Try to read DB_PASSWORD from .env if not set
  if [ -z "${DB_PASSWORD:-}" ] && [ -f "${ENV_DIR}/.env" ]; then
    export DB_PASSWORD=$(grep -oE '^DB_PASSWORD=.*' "${ENV_DIR}/.env" 2>/dev/null | head -1 | cut -d= -f2-)
  fi
fi

# ── Function: send Slack notification ────────────────────────
notify_slack() {
  local status="$1" message="$2"
  if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then return 0; fi

  local color emoji
  case "$status" in
    success) color="good"; emoji="✅" ;;
    warning) color="warning"; emoji="⚠️" ;;
    error)   color="danger";  emoji="❌" ;;
  esac

  curl -sf -X POST -H 'Content-type: application/json' \
    --data "{
      \"attachments\": [{
        \"color\": \"${color}\",
        \"title\": \"${emoji} Database Backup — ${TARGET}\",
        \"text\": \"${message}\n*Host:* ${HOSTNAME}\n*Database:* ${DB_NAME}\",
        \"ts\": $(date +%s)
      }]
    }" \
    "${SLACK_WEBHOOK_URL}" > /dev/null 2>&1 || true
}

# ── Backup ───────────────────────────────────────────────────
if [ "$OFFSITE_ONLY" = true ]; then
  log "Offsite-only mode — skipping pg_dump"
else
  info "Starting backup: ${DB_NAME} → ${BACKUP_FILE}"

  if [ "$DRY_RUN" = true ]; then
    echo "   [DRY-RUN] docker exec ${DB_CONTAINER} pg_dump ... > ${BACKUP_FILE}"
  else
    # Dump in custom format (supports parallel restore),
    # then gzip for storage compression.
    # NOTE: pg_dump custom format with --compress=9 is redundant
    # when piped through gzip — we let gzip handle compression.
    docker exec "$DB_CONTAINER" \
      pg_dump -U "$DB_USER" -d "$DB_NAME" \
        --format=custom \
        --verbose \
        2>/dev/null | gzip > "$BACKUP_FILE"

    # Verify backup size
    BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || echo "0")
    if [ "$BACKUP_SIZE" -lt 1000 ]; then
      rm -f "$BACKUP_FILE"
      notify_slack "error" "Backup file too small (${BACKUP_SIZE} bytes) — possible failure."
      error "Backup file too small (${BACKUP_SIZE} bytes) — deleted"
    fi

    # Write metadata JSON
    cat > "$BACKUP_INFO" <<JSONEOF
{
  "database": "${DB_NAME}",
  "target": "${TARGET}",
  "host": "${HOSTNAME}",
  "timestamp": "$(date -Iseconds)",
  "file": "$(basename "${BACKUP_FILE}")",
  "size_bytes": ${BACKUP_SIZE},
  "format": "custom-compressed",
  "tool": "pg_dump --format=custom --compress=9"
}
JSONEOF

    log "Backup complete: $(du -h "$BACKUP_FILE" | cut -f1)"
  fi
fi

# ── Offsite Sync ─────────────────────────────────────────────
if [ -n "${OFFSITE_HOST:-}" ] && [ -n "${OFFSITE_DIR:-}" ]; then
  info "Syncing to offsite: ${OFFSITE_HOST}:${OFFSITE_DIR}"

  if [ "$DRY_RUN" = true ]; then
    echo "   [DRY-RUN] rsync -az --progress ${BACKUP_SUBDIR}/ ${OFFSITE_HOST}:${OFFSITE_DIR}/"
  else
    SSH_CMD=""
    if [ -n "${OFFSITE_KEY:-}" ]; then
      SSH_CMD="-e ssh -i ${OFFSITE_KEY} -o StrictHostKeyChecking=no"
    fi

    if rsync -az --delete ${SSH_CMD:-} \
      "${BACKUP_SUBDIR}/" \
      "${OFFSITE_HOST}:${OFFSITE_DIR}/" 2>/dev/null; then
      log "Offsite sync complete"
    else
      warn "Offsite sync failed — backup is only local"
    fi
  fi
fi

# ── Retention Cleanup ────────────────────────────────────────
if [ "$DRY_RUN" = false ]; then
  OLD_COUNT=$(find "$BACKUP_SUBDIR" -name "${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" 2>/dev/null | wc -l)
  if [ "$OLD_COUNT" -gt 0 ]; then
    find "$BACKUP_SUBDIR" -name "${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
    log "Cleaned up $OLD_COUNT backup(s) older than ${RETENTION_DAYS} days"
  fi

  # Also clean old info files
  find "$BACKUP_SUBDIR" -name "${DB_NAME}_*.info.json" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
fi

# ── Summary ──────────────────────────────────────────────────
TOTAL_BACKUPS=$(find "$BACKUP_SUBDIR" -name "${DB_NAME}_*.sql.gz" 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_SUBDIR" 2>/dev/null | cut -f1)

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ${TARGET} Backup Summary"
echo "═══════════════════════════════════════════════════════"
echo "  Directory:  ${BACKUP_SUBDIR}"
echo "  Backups:    ${TOTAL_BACKUPS} (${TOTAL_SIZE})"
echo "  Retention:  ${RETENTION_DAYS} days"
if [ -n "${OFFSITE_HOST:-}" ]; then
  echo "  Offsite:    ${OFFSITE_HOST}:${OFFSITE_DIR}"
fi
echo "═══════════════════════════════════════════════════════"

notify_slack "success" "Backup successful — ${TOTAL_BACKUPS} backups (${TOTAL_SIZE})"
