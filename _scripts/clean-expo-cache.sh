#!/usr/bin/env bash
# ============================================================================
# clean-expo-cache.sh — Bersihkan cache bundle expo-updates di LDPlayer
#
# Masalah yang diatasi:
#   Setelah `adb install -r` (update APK), app sering masih memuat BUNDLE LAMA
#   karena expo-updates menyimpan salinan bundle di app-data:
#       /data/data/<pkg>/files/.expo-internal/bundle-*.js
#       /data/data/<pkg>/databases/updates.db*
#   Akibatnya perubahan JS (layout kartu, teks, dll.) tidak terlihat di device.
#
# Script ini menghapus cache tsb (SESI LOGIN dipertahankan — AsyncStorage
# RKStorage TIDAK disentuh), lalu me-relaunch app.
#
# Pemakaian:
#   ./_scripts/clean-expo-cache.sh                    # default ADB + pkg + relaunch
#   ./_scripts/clean-expo-cache.sh --no-launch        # jangan relaunch app
#   ADB=/path/to/adb.exe ./_scripts/clean-expo-cache.sh
#   PKG=org.example.app ./_scripts/clean-expo-cache.sh
# ============================================================================
set -euo pipefail

# Jangan biarkan Git Bash mem-mangle path argument adb
export MSYS_NO_PATHCONV=1

ADB="${ADB:-/c/LDPlayer/LDPlayer9/adb.exe}"
PKG="${PKG:-org.thsthm.mobile}"
LAUNCH=1
for arg in "$@"; do
  case "$arg" in
    --no-launch) LAUNCH=0 ;;
    -h|--help) awk '/^# ===/{c++; if(c==2) exit} c==1 && /^#/ {sub(/^# ?/,""); print}' "$0"; exit 0 ;;
    *) echo "Argumen tidak dikenal: $arg (pakai --no-launch)" >&2; exit 2 ;;
  esac
done

echo "==> adb      : $ADB"
echo "==> package  : $PKG"

if [ ! -f "$ADB" ]; then
  echo "ERROR: adb tidak ditemukan di '$ADB'. Set ADB=/path/to/adb.exe" >&2
  exit 1
fi

# Cek device terhubung
if ! "$ADB" devices | awk 'NR>1 && $2=="device"' | grep -q .; then
  echo "ERROR: tidak ada device LDPlayer terhubung (jalankan LDPlayer dulu)." >&2
  exit 1
fi

echo "==> Menutup app…"
"$ADB" shell am force-stop "$PKG" >/dev/null 2>&1 || true
sleep 1

DATA_DIR="/data/data/$PKG"
echo "==> Menghapus cache expo-updates (.expo-internal + updates.db*)…"
OUT=$("$ADB" shell "su -c 'rm -rf $DATA_DIR/files/.expo-internal && rm -f $DATA_DIR/databases/updates.db* && echo CLEANED'" 2>&1 || true)

if echo "$OUT" | grep -q "CLEANED"; then
  echo "==> Cache berhasil dibersihkan."
else
  echo "!!> 'su' tidak bekerja — output: $OUT" >&2
  echo "    Alternatif (menghapus SEMUA data app termasuk sesi login):" >&2
  echo "    adb shell pm clear $PKG" >&2
  exit 1
fi

# Verifikasi tidak ada sisa bundle cache
LEFT=$("$ADB" shell "su -c 'ls $DATA_DIR/files/.expo-internal 2>/dev/null | wc -l'" 2>/dev/null | tr -d '[:space:]' || echo '?')
if [ "${LEFT:-?}" != "0" ] && [ "${LEFT:-?}" != "?" ]; then
  echo "!!> Masih ada ${LEFT} file di .expo-internal — cek manual." >&2
fi

if [ "$LAUNCH" = "1" ]; then
  echo "==> Meluncurkan ulang app (bundle baru akan di-extract dari APK)…"
  "$ADB" shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || \
    "$ADB" shell am start -n "$PKG/.MainActivity" >/dev/null 2>&1 || true
  echo "==> Selesai. Sesuai kebutuhan, buka layar yang ingin dicek."
else
  echo "==> Selesai (tanpa relaunch). Jalankan app secara manual."
fi
