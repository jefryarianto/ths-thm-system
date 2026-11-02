#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# THS-THM — Go-Live Produksi (satu perintah)
#
# Menggabungkan tiga langkah yang wajib berurutan:
#   1. BACKUP otomatis  → reset DIBATALKAN bila backup gagal/kecil
#   2. RESET database   → semua tabel dikosongkan + akun superadmin dibuat
#   3. SEED referensi   → jabatan, tingkatan, kategori dokumen, template kartu
#
# Usage:
#   ./scripts/go-live-produksi.sh                 # interaktif (minta ketik RESET)
#   ./scripts/go-live-produksi.sh --yes           # tanpa prompt (untuk otomasi)
#   ./scripts/go-live-produksi.sh --dry-run       # tampilkan langkah, tanpa eksekusi
#   ./scripts/go-live-produksi.sh --skip-backup   # (tidak disarankan)
#
# Env:
#   COMPOSE_FILE   default docker-compose.production.yml
#   API_SERVICE    default api
#   DB_CONTAINER   default ths-thm-db
#   DB_NAME        default ths_thm_db
#   DB_USER        default ths_thm
#   BACKUP_DIR     default /opt/backups/ths-thm
#   UPLOAD_DIR     opsional — bila diset, folder upload ikut diarsipkan
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
API_SERVICE="${API_SERVICE:-api}"
DB_CONTAINER="${DB_CONTAINER:-ths-thm-db}"
DB_NAME="${DB_NAME:-ths_thm_db}"
DB_USER="${DB_USER:-ths_thm}"
BACKUP_ROOT="${BACKUP_DIR:-/opt/backups/ths-thm}"
BACKUP_DIR_TARGET="${BACKUP_ROOT}/production"

# Wajib disediakan via env — TIDAK ada password default (dihapus demi keamanan).
SUPERADMIN_EMAIL="${SUPERADMIN_EMAIL:-superadmin@ths-thm.cloud}"
SUPERADMIN_PASSWORD="${SUPERADMIN_PASSWORD:-}"
: "${SUPERADMIN_PASSWORD:?SUPERADMIN_PASSWORD wajib diset lewat environment variable (tidak ada default)}"
# Diekspor agar diteruskan ke container lewat `-e SUPERADMIN_PASSWORD` tanpa
# nilainya ikut tercetak di command line / log.
export SUPERADMIN_PASSWORD

NO_CONFIRM=false
DRY_RUN=false
SKIP_BACKUP=false

for arg in "$@"; do
  case "$arg" in
    --yes|--no-confirm) NO_CONFIRM=true ;;
    --dry-run)          DRY_RUN=true ;;
    --skip-backup)      SKIP_BACKUP=true ;;
    -h|--help)
      sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "❌ Argumen tidak dikenal: $arg (gunakan --help)" >&2; exit 1 ;;
  esac
done

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error(){ echo -e "${RED}[✗]${NC} $1" >&2; exit 1; }
info() { echo -e "${CYAN}[i]${NC} $1"; }
step() { echo ""; echo "═══ $1 ═══"; }

run() {
  # Cetak perintah; saat --dry-run jangan dieksekusi.
  echo "    \$ $*"
  if [ "$DRY_RUN" = true ]; then
    return 0
  fi
  "$@"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_DIR"

[ -f "$COMPOSE_FILE" ] || error "Compose file tidak ditemukan: ${REPO_DIR}/${COMPOSE_FILE}"

RESET_CMD=(docker compose -f "$COMPOSE_FILE" run --rm -T --no-deps \
  -e "SUPERADMIN_EMAIL=${SUPERADMIN_EMAIL}" \
  -e SUPERADMIN_PASSWORD \
  "$API_SERVICE" node prisma/reset-produksi.js --yes)
SEED_CMD=(docker compose -f "$COMPOSE_FILE" run --rm -T --no-deps "$API_SERVICE" node prisma/seed-produksi.js)

# ── Pre-flight ───────────────────────────────────────────────
step "Pre-flight"
info "Compose file : ${COMPOSE_FILE}"
info "DB container : ${DB_CONTAINER} (${DB_USER}@${DB_NAME})"
info "Backup dir   : ${BACKUP_DIR_TARGET}"

if [ "$DRY_RUN" = false ]; then
  command -v docker >/dev/null 2>&1 || error "docker tidak ditemukan di PATH"

  # Docker Desktop yang belum siap membuat `docker ps` menggantung (bukan
  # langsung gagal), jadi batasi waktunya agar script berhenti dengan pesan jelas.
  DOCKER_TIMEOUT="${DOCKER_TIMEOUT:-20}"
  RUNNING="$(timeout "$DOCKER_TIMEOUT" docker ps --format '{{.Names}}' 2>/dev/null || true)"
  if [ -z "$RUNNING" ]; then
    error "Docker engine tidak merespons dalam ${DOCKER_TIMEOUT}s. Periksa Docker Desktop/daemon lalu ulangi."
  fi
  echo "$RUNNING" | grep -qx "$DB_CONTAINER" \
    || error "Container database '${DB_CONTAINER}' tidak berjalan. Jalankan: docker compose -f ${COMPOSE_FILE} up -d"
  log "Container database berjalan"
else
  warn "Mode DRY-RUN — perintah hanya dicetak, tidak dijalankan"
fi

# ── 1. Backup ────────────────────────────────────────────────
step "1/3 Backup database"
if [ "$SKIP_BACKUP" = true ]; then
  warn "Backup DILEWATI (--skip-backup). Reset tidak punya titik pulih!"
  BACKUP_FILE=""
else
  if [ "$DRY_RUN" = true ]; then
    run bash "${SCRIPT_DIR}/backup-database.sh" --production
    BACKUP_FILE="<file backup terbaru>"
  else
    bash "${SCRIPT_DIR}/backup-database.sh" --production \
      || error "Backup gagal — reset DIBATALKAN. Tidak ada data yang diubah."

    BACKUP_FILE="$(find "$BACKUP_DIR_TARGET" -name "${DB_NAME}_*.sql.gz" -type f 2>/dev/null | sort | tail -1)"
    [ -n "$BACKUP_FILE" ] || error "File backup tidak ditemukan di ${BACKUP_DIR_TARGET} — reset DIBATALKAN."
    [ -f "$BACKUP_FILE" ] || error "File backup tidak valid: ${BACKUP_FILE} — reset DIBATALKAN."

    BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || echo 0)
    [ "$BACKUP_SIZE" -ge 1000 ] || error "Backup terlalu kecil (${BACKUP_SIZE} bytes) — reset DIBATALKAN."

    # Verifikasi isi dump benar-benar bisa dibaca pg_restore.
    gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" pg_restore --list >/dev/null 2>&1 \
      || error "Backup tidak lolos verifikasi pg_restore — reset DIBATALKAN."

    if [ -n "${UPLOAD_DIR:-}" ] && [ -d "$UPLOAD_DIR" ]; then
      UPLOAD_ARCHIVE="${BACKUP_DIR_TARGET}/uploads_$(date +%Y%m%d_%H%M%S).tar.gz"
      tar -czf "$UPLOAD_ARCHIVE" -C "$UPLOAD_DIR" . \
        && log "Upload diarsipkan: ${UPLOAD_ARCHIVE}" \
        || warn "Gagal mengarsipkan upload — lanjut (backup database sudah aman)"
    fi

    log "Backup terverifikasi: $(basename "$BACKUP_FILE") ($(du -h "$BACKUP_FILE" | cut -f1))"
  fi
fi

# ── Konfirmasi ───────────────────────────────────────────────
step "Konfirmasi"
echo -e "  ${RED}Semua data akan DIHAPUS (kecuali riwayat migrasi).${NC}"
echo "  Yang dibuat ulang:"
echo "    • akun superadmin  : ${SUPERADMIN_EMAIL}"
echo "    • jabatan          : 11 baris"
echo "    • tingkatan        : 6 baris"
echo "    • kategori dokumen : 6 baris"
echo "    • template kartu   : 1 baris (classic)"
echo "  Backup             : ${BACKUP_FILE:-<tidak ada>}"

if [ "$NO_CONFIRM" = true ]; then
  warn "Konfirmasi dilewati (--yes)"
elif [ ! -t 0 ]; then
  error "Tidak ada TTY untuk konfirmasi. Jalankan interaktif atau pakai --yes."
else
  echo ""
  read -r -p "  Ketik RESET untuk melanjutkan: " ANSWER
  [ "$ANSWER" = "RESET" ] || error "Dibatalkan — tidak ada data yang diubah."
fi

# ── 2. Reset ─────────────────────────────────────────────────
step "2/3 Reset database"
run "${RESET_CMD[@]}"

# ── 3. Seed referensi ────────────────────────────────────────
step "3/3 Seed data referensi"
run "${SEED_CMD[@]}"

# ── Verifikasi ───────────────────────────────────────────────
step "Verifikasi"
if [ "$DRY_RUN" = true ]; then
  warn "DRY-RUN — verifikasi dilewati"
  echo ""
  log "Semua langkah hanya dicetak. Jalankan tanpa --dry-run untuk eksekusi."
  exit 0
fi

q() { docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "$1" 2>/dev/null | tr -d ' '; }

USERS=$(q "SELECT count(*) FROM users")
JABATAN=$(q "SELECT count(*) FROM jabatan")
TINGKATAN=$(q "SELECT count(*) FROM tingkatan")
KATEGORI=$(q "SELECT count(*) FROM kategori_dokumen")
CARD=$(q "SELECT count(*) FROM card_templates")
EMAIL=$(q "SELECT email FROM users LIMIT 1")

printf "  %-20s %s\n" "users" "${USERS:-?} (${EMAIL:-?})"
printf "  %-20s %s\n" "jabatan" "${JABATAN:-?}"
printf "  %-20s %s\n" "tingkatan" "${TINGKATAN:-?}"
printf "  %-20s %s\n" "kategori_dokumen" "${KATEGORI:-?}"
printf "  %-20s %s\n" "card_templates" "${CARD:-?}"

[ "${USERS:-0}" = "1" ] || warn "Jumlah user bukan 1 — periksa manual"
[ "${JABATAN:-0}" = "11" ] || warn "Jabatan bukan 11 baris — periksa manual"
[ "${TINGKATAN:-0}" = "6" ] || warn "Tingkatan bukan 6 baris — periksa manual"
[ "${KATEGORI:-0}" = "6" ] || warn "Kategori dokumen bukan 6 baris — periksa manual"
[ "${CARD:-0}" = "1" ] || warn "Template kartu bukan 1 baris — periksa manual"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Go-Live selesai"
echo "═══════════════════════════════════════════════════════"
echo "  Login    : ${SUPERADMIN_EMAIL}"
echo "  Password : (sesuai SUPERADMIN_PASSWORD yang Anda set) — ganti segera setelah login"
if [ -n "${BACKUP_FILE:-}" ]; then
  echo "  Rollback : ./scripts/restore-database.sh --file ${BACKUP_FILE} --target production"
fi
echo "═══════════════════════════════════════════════════════"
