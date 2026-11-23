#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-ths-thm-db}"
API_CONTAINER="${API_CONTAINER:-ths-thm-api}"
VALKEY_CONTAINER="${VALKEY_CONTAINER:-ths-thm-valkey}"
DB_NAME="${DB_NAME:-ths_thm_db}"
DB_USER="${DB_USER:-ths_thm}"
BACKUP_ROOT="${BACKUP_DIR:-/opt/backups/ths-thm}"
BACKUP_DIR_TARGET="${BACKUP_ROOT}/production"
UPLOAD_DIR="${UPLOAD_DIR:-/opt/ths-thm/storage/uploads}"

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
  if [ -d "$UPLOAD_DIR" ]; then
    UPLOAD_ARCHIVE="${BACKUP_DIR_TARGET}/uploads_$(date +%Y%m%d_%H%M%S).tar.gz"
    tar -czf "$UPLOAD_ARCHIVE" -C "$UPLOAD_DIR" . && log "Upload diarsipkan: $UPLOAD_ARCHIVE"
  fi
  log "Backup terverifikasi: $BACKUP_FILE"
else
  warn 'Mode DRY-RUN — backup dilewati, tidak ada perubahan'
fi

if [ "$NO_CONFIRM" = false ] && [ "$DRY_RUN" = false ]; then
  if [ ! -t 0 ]; then
    error 'Tidak ada TTY untuk konfirmasi. Jalankan interaktif atau pakai --yes.'
  fi
  printf 'Ketik RESET untuk melanjutkan: '
  read -r ANSWER
  [ "$ANSWER" = 'RESET' ] || error 'Dibatalkan'
fi

docker cp "${REPO_DIR}/apps/api/prisma/reset-members-claims.js" "${API_CONTAINER}:/app/prisma/reset-members-claims.js"
docker cp "${REPO_DIR}/apps/api/prisma/lib" "${API_CONTAINER}:/app/prisma/lib"

if [ "$DRY_RUN" = true ]; then
  docker exec "$API_CONTAINER" node prisma/reset-members-claims.js
  exit 0
fi

docker exec "$API_CONTAINER" node prisma/reset-members-claims.js --yes

for prefix in members claims reports kta documents; do
  docker exec "$VALKEY_CONTAINER" sh -c "valkey-cli --scan --pattern '${prefix}:*' | while IFS= read -r k; do [ -n \"\$k\" ] && valkey-cli DEL \"\$k\"; done" >/dev/null
done
log 'Cache members/claims/reports/kta/documents dibersihkan'

q() { docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "$1" 2>/dev/null | tr -d ' '; }
ANGGOTA=$(q 'SELECT count(*) FROM anggota')
KLAIM=$(q 'SELECT count(*) FROM klaim')
IURAN=$(q 'SELECT count(*) FROM iuran')
KTA=$(q 'SELECT count(*) FROM kta_applications')
DOKUMEN=$(q 'SELECT count(*) FROM dokumen')
REMINDERS=$(q 'SELECT count(*) FROM iuran_reminders')
printf 'anggota=%s klaim=%s iuran=%s kta=%s dokumen=%s iuran_reminders=%s\n' "$ANGGOTA" "$KLAIM" "$IURAN" "$KTA" "$DOKUMEN" "$REMINDERS"
[ "$ANGGOTA" = '0' ] || warn 'anggota belum 0'
[ "$KLAIM" = '0' ] || warn 'klaim belum 0'

if [ -n "$BACKUP_FILE" ]; then
  printf 'Rollback DB: ./scripts/restore-database.sh --file %s --target production\n' "$BACKUP_FILE"
fi
log 'Reset members + claims selesai'