#!/usr/bin/env bash
# rotate-keystore.sh
# Generate a new Android release keystore and document rotation steps
#
# ⚠️  AFTER GENERATING NEW KEYSTORE:
# 1. Update GitHub Secrets (ANDROID_KEYSTORE_BASE64, KEY_STORE_PASSWORD, KEY_PASSWORD, KEY_ALIAS)
# 2. Run BFG Repo-Cleaner to remove old keystore credentials from git history
# 3. Update local key.properties.template with new values
# 4. Test build: flutter build apk --release

set -euo pipefail

KEYSTORE_NAME="ths-thm-release.jks"
ALIAS="ths-thm-release"
VALIDITY_DAYS=36500  # 100 years
KEYSIZE=2048
STORETYPE="PKCS12"

# Generate secure random passwords
STORE_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
KEY_PASSWORD="${STORE_PASSWORD}"  # For PKCS12, store and key password must be same
DN="CN=THS-THM Release, OU=Mobile, O=THS-THM, L=Manokwari, ST=Papua Barat, C=ID"

echo "🔐 Generating new Android release keystore"
echo "=========================================="
echo "Keystore: ${KEYSTORE_NAME}"
echo "Alias:    ${ALIAS}"
echo "Validity: ${VALIDITY_DAYS} days"
echo "DN:       ${DN}"
echo ""

# Generate keystore
keytool -genkeypair -v \
  -keystore "${KEYSTORE_NAME}" \
  -storetype "${STORETYPE}" \
  -keyalg RSA \
  -keysize ${KEYSIZE} \
  -validity ${VALIDITY_DAYS} \
  -alias "${ALIAS}" \
  -storepass "${STORE_PASSWORD}" \
  -keypass "${KEY_PASSWORD}" \
  -dname "${DN}"

echo ""
echo "✅ Keystore generated: ${KEYSTORE_NAME}"
echo ""
echo "=========================================="
echo "📋 CREDENTIALS (SAVE THESE SECURELY!):"
echo "=========================================="
echo "ANDROID_KEYSTORE_BASE64: (run base64 command below)"
echo "KEY_STORE_PASSWORD: ${STORE_PASSWORD}"
echo "KEY_PASSWORD: ${KEY_PASSWORD}"
echo "KEY_ALIAS: ${ALIAS}"
echo ""

# Generate base64 for GitHub secret
echo "📦 Base64 encoding for GitHub Secret..."
if command -v base64 &> /dev/null; then
  # Linux/macOS
  base64 -w0 "${KEYSTORE_NAME}" > "${KEYSTORE_NAME}.b64"
else
  # Windows PowerShell fallback (run manually)
  echo "Run in PowerShell:"
  echo "  \$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes(\"${KEYSTORE_NAME}\"))"
  echo "  [IO.File]::WriteAllText(\"${KEYSTORE_NAME}.b64\", \$b64)"
fi

if [ -f "${KEYSTORE_NAME}.b64" ]; then
  echo "Saved to ${KEYSTORE_NAME}.b64"
  echo ""
  echo "GitHub Secret value (ANDROID_KEYSTORE_BASE64):"
  cat "${KEYSTORE_NAME}.b64"
  echo ""
fi

echo "=========================================="
echo "🚀 NEXT STEPS:"
echo "=========================================="
echo "1. Add/update GitHub Secrets:"
echo "   - ANDROID_KEYSTORE_BASE64: (content of ${KEYSTORE_NAME}.b64)"
echo "   - KEY_STORE_PASSWORD: ${STORE_PASSWORD}"
echo "   - KEY_PASSWORD: ${KEY_PASSWORD}"
echo "   - KEY_ALIAS: ${ALIAS}"
echo ""
echo "2. Update local key.properties.template:"
echo "   storePassword=${STORE_PASSWORD}"
echo "   keyPassword=${KEY_PASSWORD}"
echo "   keyAlias=${ALIAS}"
echo "   storeFile=${KEYSTORE_NAME}"
echo ""
echo "3. REMOVE OLD CREDENTIALS FROM GIT HISTORY (CRITICAL):"
echo "   # Install BFG Repo-Cleaner: https://rtyley.github.io/bfg-repo-cleaner/"
echo "   # Download bfg.jar, then run:"
echo "   java -jar bfg.jar --replace-text <(echo '5tr6w1nG#!==>REDACTED') ."
echo "   # Or use git-filter-repo:"
echo "   pip install git-filter-repo"
echo "   git filter-repo --replace-text <(echo '5tr6w1nG#!==>REDACTED') --force"
echo ""
echo "4. Force push cleaned history:"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "5. Test build locally:"
echo "   cd apps/mobile_flutter"
echo "   cp key.properties.template key.properties"
echo "   # Edit key.properties with new values"
echo "   flutter build apk --release"
echo ""
echo "6. Verify APK signature:"
echo "   keytool -printcert -jarfile build/app/outputs/flutter-apk/app-release.apk | grep SHA256"
echo ""
echo "⚠️  IMPORTANT: Old APKs signed with old keystore CANNOT be updated."
echo "   Users will need to uninstall old version before installing new one."
echo "   Plan rotation with a version bump and user communication."