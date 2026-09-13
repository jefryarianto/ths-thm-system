#!/bin/bash
# ── Pre-commit hook: gitleaks secret scanning ──────────────────────────
# Memindai perubahan STAGED sebelum commit — secret tidak akan pernah
# masuk git history. Jalankan `bash scripts/install-hooks.sh` sekali
# untuk memasang hook ini.
#
# Lewati sekali untuk commit khusus (mis. menghapus secret lama):
#   git commit --no-verify
# ────────────────────────────────────────────────────────────────────────

# Cari binary gitleaks (winget di Windows menaruhnya di WinGet/Links,
# bukan PATH shell Git Bash saat ini).
find_gitleaks() {
  if command -v gitleaks >/dev/null 2>&1; then
    command -v gitleaks
    return 0
  fi
  local winget_link="$LOCALAPPDATA/Microsoft/WinGet/Links/gitleaks.exe"
  if [ -f "$winget_link" ]; then
    echo "$winget_link"
    return 0
  fi
  local winget_pkg
  winget_pkg=$(find "$LOCALAPPDATA/Microsoft/WinGet/Packages" \
    -maxdepth 2 -name "gitleaks.exe" 2>/dev/null | head -n 1)
  if [ -n "$winget_pkg" ]; then
    echo "$winget_pkg"
    return 0
  fi
  return 1
}

GITLEAKS_BIN="$(find_gitleaks)" || {
  cat >&2 <<'MSG'
⚠️  gitleaks tidak ditemukan — pre-commit secret scanning DILEWATI.

   Pasang agar secret tidak pernah ter-commit:
     winget install Gitleaks.Gitleaks        (Windows)
     brew install gitleaks                   (macOS)
     # atau unduh binary: https://github.com/gitleaks/gitleaks/releases

   Butuh bypass sekali? git commit --no-verify
MSG
  exit 0
}

# Staged diff kosong (mis. commit merge) → tidak ada yang dipindai
if [ -z "$(git diff --cached --name-only 2>/dev/null)" ]; then
  exit 0
fi

CONFIG="$(git rev-parse --show-toplevel)/.gitleaks.toml"

# shellcheck disable=SC2086
"$GITLEAKS_BIN" protect --staged \
  --config "$CONFIG" \
  --redact \
  --no-banner \
  --verbose
