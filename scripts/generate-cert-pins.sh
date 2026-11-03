#!/usr/bin/env bash
# generate-cert-pins.sh
# Generate SHA-256 SPKI pins for certificate pinning
# Usage: ./generate-cert-pins.sh <domain> [port]
# Example: ./generate-cert-pins.sh ths-thm.cloud 443
#          ./generate-cert-pins.sh api.ths-thm.org 443

set -euo pipefail

DOMAIN="${1:-ths-thm.cloud}"
PORT="${2:-443}"

echo "🔐 Generating SPKI pins for ${DOMAIN}:${PORT}"
echo "=========================================="

# Method 1: Using openssl s_client (works for any TLS service)
echo ""
echo "Method 1: openssl s_client"
echo "-------------------------"
echo | openssl s_client -connect "${DOMAIN}:${PORT}" -servername "${DOMAIN}" 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  base64

# Method 2: If you have the cert file locally
# echo ""
# echo "Method 2: From local cert file (cert.pem)"
# echo "--------------------------------------"
# openssl x509 -in cert.pem -pubkey -noout | \
#   openssl pkey -pubin -outform der | \
#   openssl dgst -sha256 -binary | \
#   base64

echo ""
echo "=========================================="
echo "📋 Copy the base64 string(s) above into:"
echo "  - apps/mobile_flutter/android/app/src/main/res/xml/network_security_config.xml"
echo "  - apps/mobile_flutter/ios/Runner/Info.plist"
echo ""
echo "💡 Generate a BACKUP pin too (from a different cert or intermediate CA)"
echo "   to allow seamless certificate rotation without app updates."
echo ""
echo "Example network_security_config.xml pin-set:"
echo '  <pin-set expiration="2027-12-31">'
echo "    <pin digest=\"SHA-256\">PRIMARY_PIN_HERE</pin>"
echo "    <pin digest=\"SHA-256\">BACKUP_PIN_HERE</pin>"
echo '  </pin-set>'