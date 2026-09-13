#!/bin/bash
set -e

echo "Installing git hooks..."

HOOKS_DIR="$(git rev-parse --git-dir)/hooks"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"

# Install pre-commit hook (gitleaks secret scanning)
if [ -f "$HOOKS_DIR/pre-commit" ]; then
  echo "⚠️  Backing up existing pre-commit hook → pre-commit.bak"
  cp "$HOOKS_DIR/pre-commit" "$HOOKS_DIR/pre-commit.bak"
fi
cp "$SCRIPTS_DIR/pre-commit.sh" "$HOOKS_DIR/pre-commit"
chmod +x "$HOOKS_DIR/pre-commit"
echo "✅ Installed pre-commit hook ($HOOKS_DIR/pre-commit)"

# Install pre-push hook
if [ -f "$HOOKS_DIR/pre-push" ]; then
  echo "⚠️  Backing up existing pre-push hook → pre-push.bak"
  cp "$HOOKS_DIR/pre-push" "$HOOKS_DIR/pre-push.bak"
fi
cp "$SCRIPTS_DIR/pre-push.sh" "$HOOKS_DIR/pre-push"
chmod +x "$HOOKS_DIR/pre-push"
echo "✅ Installed pre-push hook ($HOOKS_DIR/pre-push)"

echo ""
echo "Hooks installed."
echo "  - pre-commit : secret scanning via gitleaks (butuh binary gitleaks)"
echo "  - pre-push   : validasi sebelum push"
echo "To bypass hooks: git commit --no-verify / git push --no-verify"
