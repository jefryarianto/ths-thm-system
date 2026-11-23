#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-ths-thm-db}"
API_CONTAINER="${API_CONTAINER:-ths-thm-api}"
VALKEY_CONTAINER="${VALKEY_CONTAINER:-ths-thm-valkey}"
DB_NAME="${DB_NAME:-ths_thm_db}"
DB_USER="${DB_USER:-ths_thm}"
BACKUP_ROOT="${BACKUP_DIR:-/opt/backups/ths-thm}"
BACKUP_DIR_TARGET="${BACKUP_ROOT}/production"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_DIR"

DRY_RUN=false
NO_CONFIRM=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --yes|--no-confirm) NO_CONFIRM=true ;;
    *) printf 'Argumen tidak dikenal: %s\n' "$arg" >&2; exit 1 ;;
  esac
done

log() { printf '[ok] %s\n' "$1"; }
warn() { printf '[warn] %s\n' "$1"; }
error() { printf '[err] %s\n' "$1" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || error 'docker tidak ditemukan'
RUNNING="$(docker ps --format '{{.Names}}')"
for c in "$DB_CONTAINER" "$API_CONTAINER" "$VALKEY_CONTAINER"; do
  printf '%s\n' "$RUNNING" | grep -qx "$c" || error "Container $c tidak berjalan"
done

BACKUP_FILE=''
if [ "$DRY_RUN" = false ]; then
  bash "${SCRIPT_DIR}/backup-database.sh" --production || error 'Backup gagal — reset dibatalkan'
  BACKUP_FILE="$(find "$BACKUP_DIR_TARGET" -name "${DB_NAME}_*.sql.gz" -type f 2>/dev/null | sort | tail -1)"
  [ -n "$BACKUP_FILE" ] || error 'File backup tidak ditemukan — reset dibatalkan'
  BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || echo 0)
  [ "$BACKUP_SIZE" -ge 1000 ] || error "Backup terlalu kecil (${BACKUP_SIZE} bytes) — reset dibatalkan"
  gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" pg_restore --list >/dev/null 2>&1 \
    || error 'Backup tidak lolos verifikasi pg_restore — reset dibatalkan'
  log "Backup terverifikasi: $BACKUP_FILE"
else
  warn 'Mode DRY-RUN — backup dilewati, tidak ada perubahan'
fi

if [ "$NO_CONFIRM" = false ] && [ "$DRY_RUN" = false ]; then
  if [ ! -t 0 ]; then
    error 'Tidak ada TTY untuk konfirmasi. Jalankan interaktif atau pakai --yes.'
  fi
  printf 'Ketik RESET USERS untuk melanjutkan: '
  read -r ANSWER
  [ "$ANSWER" = 'RESET USERS' ] || error 'Dibatalkan'
fi

docker cp "${REPO_DIR}/apps/api/prisma/reset-users.js" "${API_CONTAINER}:/app/prisma/reset-users.js"
docker cp "${REPO_DIR}/apps/api/prisma/lib/members-claims-reset.js" "${API_CONTAINER}:/app/prisma/lib/members-claims-reset.js"

if [ "$DRY_RUN" = true ]; then
  docker exec "$API_CONTAINER" node prisma/reset-users.js
  exit 0
fi

docker exec "$API_CONTAINER" node prisma/reset-users.js --yes

for prefix in users auth sessions notifications; do
  docker exec "$VALKEY_CONTAINER" sh -c "valkey-cli --scan --pattern '${prefix}:*' | while IFS= read -r k; do [ -n \"\$k\" ] && valkey-cli DEL \"\$k\"; done" >/dev/null
done
log 'Cache users/auth/sessions/notifications dibersihkan'

q() { docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "$1" 2>/dev/null | tr -d ' '; }
USERS=$(q 'SELECT count(*) FROM users')
NOTIFIKASI=$(q 'SELECT count(*) FROM notifikasi')
DEVICE=$(q 'SELECT count(*) FROM device_tokens')
KEPENGURUSAN=$(q 'SELECT count(*) FROM kepengurusan')
printf 'users=%s notifikasi=%s device_tokens=%s kepengurusan=%s\n' "$USERS" "$NOTIFIKASI" "$DEVICE" "$KEPENGURUSAN"
[ "$USERS" = '0' ] || warn 'users belum 0'

if [ -n "$BACKUP_FILE" ]; then
  printf 'Rollback DB: ./scripts/restore-database.sh --file %s --target production\n' "$BACKUP_FILE"
fi
log 'Reset users selesai'
