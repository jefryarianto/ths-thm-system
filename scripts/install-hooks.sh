#!/bin/bash
set -e

echo "Installing git hooks..."

HOOKS_DIR="$(git rev-parse --git-dir)/hooks"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"

# Install pre-push hook
if [ -f "$HOOKS_DIR/pre-push" ]; then
  echo "⚠️  Backing up existing pre-push hook → pre-push.bak"
  cp "$HOOKS_DIR/pre-push" "$HOOKS_DIR/pre-push.bak"
fi
cp "$SCRIPTS_DIR/pre-push.sh" "$HOOKS_DIR/pre-push"
chmod +x "$HOOKS_DIR/pre-push"
echo "✅ Installed pre-push hook ($HOOKS_DIR/pre-push)"

echo ""
echo "Hooks installed. They will run on 'git push'."
echo "To bypass hooks: git push --no-verify"
