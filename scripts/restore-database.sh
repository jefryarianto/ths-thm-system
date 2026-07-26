#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# THS-THM Database Restore Script
# Restore a PostgreSQL backup from a local or offsite file.
#
# Usage:
#   ./scripts/restore-database.sh --list                  # List backups
#   ./scripts/restore-database.sh --latest                 # Restore newest
#   ./scripts/restore-database.sh --file backup.sql.gz     # Restore specific
#   ./scripts/restore-database.sh --dry-run --latest       # Dry-run
#   ./scripts/restore-database.sh --from-offsite           # Fetch + restore
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── Help ─────────────────────────────────────────────────────
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ] || [ $# -eq 0 ]; then
  cat <<'HELP'
Usage: restore-database.sh [OPTIONS]

Restore a PostgreSQL database from a backup file.

Options:
  --list              List available backups
  --latest            Restore the most recent backup
  --file <path>       Restore a specific backup file (.sql.gz)
  --stdin             Read backup from stdin (pipe: gunzip -c file.sql.gz | ...)
  --target <env>      Database target: production (default) or staging
  --dry-run           Show what would be done without doing it
  --from-offsite      Fetch latest backup from offsite host before restoring
  --no-confirm        Skip confirmation prompt (for scripts/CI)
  -h, --help          Show this help

Environment variables:
  OFFSITE_HOST        Offsite rsync host
  OFFSITE_DIR         Offsite backup directory
  OFFSITE_KEY         SSH key for offsite

Examples:
  ./scripts/restore-database.sh --list
  ./scripts/restore-database.sh --latest --dry-run
  ./scripts/restore-database.sh --file /opt/backups/ths_thm_db_20260101_020000.sql.gz
  gunzip -c backup.sql.gz | ./scripts/restore-database.sh --stdin --staging
HELP
  exit 0
fi

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error(){ echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[i]${NC} $1"; }

# ── Defaults ─────────────────────────────────────────────────
TARGET="production"
DRY_RUN=false
NO_CONFIRM=false
FROM_OFFSITE=false
MODE=""  # list | latest | file | stdin
FILE=""

# Parse arguments
while [ $# -gt 0 ]; do
  case "$1" in
    --list)        MODE="list" ;;
    --latest)      MODE="latest" ;;
    --file)        MODE="file"; shift; FILE="$1" ;;
    --stdin)       MODE="stdin" ;;
    --target)      shift; TARGET="$1" ;;
    --dry-run)     DRY_RUN=true ;;
    --no-confirm)  NO_CONFIRM=true ;;
    --from-offsite) FROM_OFFSITE=true ;;
    *) error "Unknown argument: $1 (use --help)" ;;
  esac
  shift
done

# Target config
case "$TARGET" in
  production)
    DB_CONTAINER="ths-thm-db"
    DB_NAME="ths_thm_db"
    DB_USER="ths_thm"
    BACKUP_DIR="/opt/backups/ths-thm/production"
    ENV_DIR="/opt/ths-thm"
    ;;
  staging)
    DB_CONTAINER="ths-thm-staging-db"
    DB_NAME="ths_thm_staging"
    DB_USER="ths_thm_staging"
    BACKUP_DIR="/opt/backups/ths-thm/staging"
    ENV_DIR="/opt/ths-thm-staging"
    ;;
  *) error "Unknown target: $TARGET (use production or staging)" ;;
esac

# ── Fetch from offsite ───────────────────────────────────────
if [ "$FROM_OFFSITE" = true ]; then
  if [ -z "${OFFSITE_HOST:-}" ] || [ -z "${OFFSITE_DIR:-}" ]; then
    error "OFFSITE_HOST and OFFSITE_DIR must be set for --from-offsite"
  fi
  SSH_CMD=""
  if [ -n "${OFFSITE_KEY:-}" ]; then
    SSH_CMD="-e ssh -i ${OFFSITE_KEY} -o StrictHostKeyChecking=no"
  fi
  info "Fetching latest backup from offsite: ${OFFSITE_HOST}:${OFFSITE_DIR}"
  if [ "$DRY_RUN" = false ]; then
    mkdir -p "$BACKUP_DIR"
    rsync -az ${SSH_CMD:-} "${OFFSITE_HOST}:${OFFSITE_DIR}/" "$BACKUP_DIR/"
    log "Offsite fetch complete"
  else
    echo "   [DRY-RUN] rsync -az ${OFFSITE_HOST}:${OFFSITE_DIR}/ ${BACKUP_DIR}/"
  fi
fi

# ── List backups ─────────────────────────────────────────────
if [ "$MODE" = "list" ]; then
  echo "📋 Available backups for ${TARGET}:"
  echo ""
  if [ -d "$BACKUP_DIR" ]; then
    find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -exec ls -lh {} \; 2>/dev/null | sort -k6,7
  else
    warn "Backup directory does not exist: ${BACKUP_DIR}"
  fi
  exit 0
fi

# ── Determine backup file ────────────────────────────────────
case "$MODE" in
  latest)
    FILE=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f 2>/dev/null | sort | tail -1)
    if [ -z "$FILE" ]; then
      error "No backup files found in ${BACKUP_DIR}"
    fi
    info "Latest backup: $(basename "$FILE") ($(du -h "$FILE" | cut -f1))"
    ;;
  file)
    if [ ! -f "$FILE" ]; then
      error "Backup file not found: ${FILE}"
    fi
    info "Using backup: $(basename "$FILE") ($(du -h "$FILE" | cut -f1))"
    ;;
  stdin)
    info "Reading backup from stdin..."
    ;;
  *)
    error "No action specified. Use --list, --latest, --file, or --stdin"
    ;;
esac

# ── Safety checks ────────────────────────────────────────────
if [ "$MODE" != "stdin" ]; then
  # Verify file integrity
  info "Verifying backup file integrity..."
  if echo "$FILE" | grep -q '\.gz$'; then
    if [ "$DRY_RUN" = false ]; then
      gzip -t "$FILE" 2>/dev/null || error "Backup file is corrupted (gzip check failed)"
    fi
    log "Integrity check passed"
  fi
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  error "Database container '${DB_CONTAINER}' is not running"
fi  # Warn if restoring to production
if [ "$TARGET" = "production" ] && [ "$NO_CONFIRM" = false ]; then
  echo ""
  echo -e "${RED}⚠️  YOU ARE ABOUT TO RESTORE THE PRODUCTION DATABASE!${NC}"
  echo -e "${YELLOW}   This will OVERWRITE the current data in '${DB_NAME}'.${NC}"
  echo ""
  echo -e "   Backup file: ${FILE:-<stdin>}"
  echo ""
  read -r -p "   Type 'yes' to confirm: " CONFIRM </dev/tty
  if [ "$CONFIRM" != "yes" ]; then
    error "Restore cancelled by user"
  fi
fi

# ── Perform restore ──────────────────────────────────────────
if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  DRY RUN — no changes made"
  echo "═══════════════════════════════════════════════════════"
  echo "  Target:      ${TARGET}"
  echo "  Container:   ${DB_CONTAINER}"
  echo "  Database:    ${DB_NAME}"
  if [ "$MODE" = "stdin" ]; then
    echo "  Source:      <stdin>"
    echo "  Command:     docker exec -i ${DB_CONTAINER} pg_restore ..."
  else
    echo "  Source:      ${FILE}"
    echo "  Size:        $(du -h "$FILE" | cut -f1)"
    echo "  Command:     gunzip -c ${FILE} | docker exec -i ${DB_CONTAINER} pg_restore ..."
  fi
  echo ""
  echo "  To restore for real, run without --dry-run"
  echo "═══════════════════════════════════════════════════════"
  exit 0
fi

info "Starting restore of ${DB_NAME} in container ${DB_CONTAINER}..."

if [ "$MODE" = "stdin" ]; then
  # Restore from stdin using pg_restore (custom format)
  docker exec -i "$DB_CONTAINER" \
    pg_restore -U "$DB_USER" -d "$DB_NAME" \
      --clean \
      --if-exists \
      --no-owner \
      --verbose \
      2>&1 || error "Restore failed (check output above)"
else
  # Restore from file (gunzip → pg_restore)
  gunzip -c "$FILE" | docker exec -i "$DB_CONTAINER" \
    pg_restore -U "$DB_USER" -d "$DB_NAME" \
      --clean \
      --if-exists \
      --no-owner \
      --verbose \
      2>&1 || error "Restore failed (check output above)"
fi

log "✅ Restore completed successfully!"
log "Database '${DB_NAME}' has been restored from: ${FILE:-<stdin>}"

# ── Post-restore verification ────────────────────────────────
info "Running post-restore verification..."
VERIFY_QUERY="SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
TABLE_COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "$VERIFY_QUERY" 2>/dev/null | tr -d ' ')
if [ -n "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
  log "Verification passed: ${TABLE_COUNT} tables found in '${DB_NAME}'"
else
  warn "Verification warning: could not count tables (restore may be incomplete)"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Restore Complete"
echo "═══════════════════════════════════════════════════════"
echo "  Target:   ${TARGET}"
echo "  Database: ${DB_NAME}"
echo "  Tables:   ${TABLE_COUNT:-unknown}"
echo "═══════════════════════════════════════════════════════"
