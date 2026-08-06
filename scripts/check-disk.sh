#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# THS-THM Disk Space Monitor
# Checks disk usage hourly, emails an alert when usage exceeds a
# threshold, and optionally runs Docker cleanup to recover space.
#
# Notification is sent via Resend API (reads RESEND_API_KEY and
# RESEND_DOMAIN from the production .env).
#
# Designed to run via systemd timer (hourly) or cron.
#
# Usage:
#   ./scripts/check-disk.sh                    # production defaults
#   THRESHOLD_PCT=90 ./scripts/check-disk.sh   # custom threshold
#   ./scripts/check-disk.sh --dry-run
#   ./scripts/check-disk.sh --help
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── Help ─────────────────────────────────────────────────────
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  cat <<'HELP'
Usage: check-disk.sh [OPTIONS]

Monitor disk usage and alert when above threshold.

Environment variables:
  THRESHOLD_PCT   Alert when usage exceeds this %% (default: 85)
  ALERT_EMAIL     Recipient of the alert email (default: jefryarianto@gmail.com)
  ALERT_FROM      Sender email (default: no-reply@<RESEND_DOMAIN>)
  AUTO_CLEANUP    "true" to run docker prune on alert (default: true)
  ENV_DIR         Directory containing .env with RESEND_API_KEY (default: /opt/ths-thm)
  MOUNT_POINT     Filesystem to check (default: /)
  COOLDOWN_MIN    Min minutes between repeated alerts for the same threshold
                  (default: 0 = alert every run while above threshold)

Options:
  --dry-run       Show what would be done without sending/pruning
  -h, --help      Show this help
HELP
  exit 0
fi

# ── Configuration ─────────────────────────────────────────────
THRESHOLD_PCT="${THRESHOLD_PCT:-85}"
ALERT_EMAIL="${ALERT_EMAIL:-jefryarianto@gmail.com}"
AUTO_CLEANUP="${AUTO_CLEANUP:-true}"
ENV_DIR="${ENV_DIR:-/opt/ths-thm}"
MOUNT_POINT="${MOUNT_POINT:-/}"
COOLDOWN_MIN="${COOLDOWN_MIN:-0}"
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
  esac
done

HOSTNAME=$(hostname -s 2>/dev/null || echo "vps")
STATE_FILE="/tmp/ths-thm-disk-alerted"

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${CYAN}[i]${NC} $1"; }

# ── Read Resend credentials from .env ─────────────────────────
RESEND_API_KEY=""
RESEND_DOMAIN=""
if [ -f "${ENV_DIR}/.env" ]; then
  RESEND_API_KEY=$(grep -oE '^RESEND_API_KEY=.*' "${ENV_DIR}/.env" 2>/dev/null | head -1 | cut -d= -f2-)
  RESEND_DOMAIN=$(grep -oE '^RESEND_DOMAIN=.*' "${ENV_DIR}/.env" 2>/dev/null | head -1 | cut -d= -f2-)
fi
ALERT_FROM="${ALERT_FROM:-no-reply@${RESEND_DOMAIN:-ths-thm.cloud}}"

# ── Disk usage ────────────────────────────────────────────────
# Sample: /dev/vda1  40G  11G  27G  30%  /
read -r USED_PCT DISK_LINE <<< "$(df -P "$MOUNT_POINT" 2>/dev/null | awk 'NR==2 {gsub(/%/,"",$5); print $5, $0}')"

if [ -z "${USED_PCT:-}" ]; then
  echo "❌ Could not read disk usage for ${MOUNT_POINT}"
  exit 1
fi

info "Disk usage: ${USED_PCT}% (threshold: ${THRESHOLD_PCT}%)"
info "  ${DISK_LINE}"

# ── Below threshold → normal exit ─────────────────────────────
if [ "$USED_PCT" -le "$THRESHOLD_PCT" ]; then
  log "Disk OK — no alert needed"
  rm -f "$STATE_FILE" 2>/dev/null || true
  exit 0
fi

# ── Above threshold → check cooldown ──────────────────────────
NOW_EPOCH=$(date +%s)
if [ -f "$STATE_FILE" ] && [ "$COOLDOWN_MIN" -gt 0 ]; then
  LAST_ALERT=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
  ELAPSED=$(( (NOW_EPOCH - LAST_ALERT) / 60 ))
  if [ "$ELAPSED" -lt "$COOLDOWN_MIN" ]; then
    info "Cooldown active (last alert ${ELAPSED}m ago, cooldown ${COOLDOWN_MIN}m) — skipping"
    exit 0
  fi
fi

warn "Disk usage ${USED_PCT}% exceeds threshold ${THRESHOLD_PCT}%!"

# ── Auto cleanup (Docker prune) ───────────────────────────────
if [ "$AUTO_CLEANUP" = "true" ]; then
  info "Running Docker cleanup to recover space..."
  if [ "$DRY_RUN" = true ]; then
    echo "   [DRY-RUN] docker image prune -af + docker builder prune -af"
  else
    docker image prune -af >/dev/null 2>&1 || true
    docker builder prune -af >/dev/null 2>&1 || true
    docker container prune -f >/dev/null 2>&1 || true
    log "Docker cleanup finished"
  fi
fi

# ── Send email alert ──────────────────────────────────────────
BODY="Disk usage on ${HOSTNAME} is at ${USED_PCT}% (threshold ${THRESHOLD_PCT}%).

${DISK_LINE}

Recommended actions:
  - docker image prune -af
  - docker builder prune -af
  - Review /var/log, /opt/backups and journald for large files"

if [ "$DRY_RUN" = true ]; then
  echo "   [DRY-RUN] Would email ${ALERT_EMAIL} (from ${ALERT_FROM})"
else
  if [ -z "$RESEND_API_KEY" ]; then
    echo "   ⚠️ RESEND_API_KEY not found — email skipped"
  else
    # Build JSON payload with python (handles escaping of newlines/quotes in $BODY)
    PAYLOAD=$(python3 -c '
import json, sys
email, frm, subject, body = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
print(json.dumps({"to": email, "from": frm, "subject": subject, "text": body}))
' "$ALERT_EMAIL" "$ALERT_FROM" "Disk Alert: ${USED_PCT}% used on ${HOSTNAME} (ths-thm.cloud)" "$BODY")

    if curl -sf -X POST https://api.resend.com/emails \
      -H "Authorization: Bearer ${RESEND_API_KEY}" \
      -H "Content-Type: application/json" \
      --data "$PAYLOAD" > /dev/null 2>&1; then
      log "Alert email sent to ${ALERT_EMAIL}"
    else
      echo "   ⚠️ Failed to send email (check RESEND_API_KEY / RESEND_DOMAIN)"
    fi
  fi

  echo "$NOW_EPOCH" > "$STATE_FILE"
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Disk Monitor Summary"
echo "═══════════════════════════════════════════════════════"
echo "  Host:          ${HOSTNAME}"
echo "  Usage:         ${USED_PCT}%"
echo "  Threshold:     ${THRESHOLD_PCT}%"
echo "  Auto-cleanup:  ${AUTO_CLEANUP}"
echo "  Alert email:   ${ALERT_EMAIL}"
echo "═══════════════════════════════════════════════════════"
