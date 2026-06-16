#!/bin/bash
set -e

echo "=============================="
echo "  🔍 Pre-Push Validation"
echo "=============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
FAILED=0

check_step() {
  local name="$1"
  shift
  echo ""
  echo "▶️  $name..."
  if "$@"; then
    echo -e "${GREEN}✅ $name passed${NC}"
  else
    echo -e "${RED}❌ $name failed${NC}"
    FAILED=1
  fi
}

# ── Step 1: TypeScript Compilation ──
check_step "TypeScript Compilation" pnpm run typecheck

# ── Step 2: Lint ──
check_step "Lint" pnpm run lint

# ── Step 3: Format Check ──
check_step "Format Check" pnpm run format:check

# ── Step 4: Check for .only in tests ──
echo ""
echo "▶️  Checking for test .only..."
FOUND_ONLY=$(grep -rn 'it\.only\|describe\.only' --include='*.spec.ts' --include='*.test.ts' --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git . || true)
if [ -n "$FOUND_ONLY" ]; then
  echo "$FOUND_ONLY"
  echo -e "${RED}❌ Found .only in test files${NC}"
  FAILED=1
else
  echo -e "${GREEN}✅ No .only in test files${NC}"
fi

# ── Step 5: Check for .skip in tests (warning only) ──
FOUND_SKIP=$(grep -rn 'it\.skip\|describe\.skip' --include='*.spec.ts' --include='*.test.ts' --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git . || true)
if [ -n "$FOUND_SKIP" ]; then
  echo -e "${YELLOW}⚠️  Found .skip in test files${NC}"
fi

# ── Final Result ──
echo ""
echo "=============================="
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}  ✅ All pre-push checks passed${NC}"
  echo "=============================="
  exit 0
else
  echo -e "${RED}  ❌ Some checks failed — fix before pushing${NC}"
  echo "=============================="
  exit 1
fi
