#!/bin/sh
set -e

# ── Fix @ths-thm/shared-types resolution ──────────────────────────
# pnpm workspace symlinks are not reliably preserved by Docker COPY.
# This ensures the module is always available as a real directory.
ST_PKG="/app/node_modules/@ths-thm/shared-types"
if [ ! -f "$ST_PKG/package.json" ] || [ ! -f "$ST_PKG/dist/index.js" ]; then
  echo "🔧 Fixing @ths-thm/shared-types module..."
  rm -rf "$ST_PKG"
  mkdir -p "$ST_PKG/dist"
  # Files were staged during Docker build (see Dockerfile)
  cp /tmp/shared-types-pkg/package.json "$ST_PKG/"
  cp /tmp/shared-types-pkg/dist/index.js "$ST_PKG/dist/"
  cp /tmp/shared-types-pkg/dist/index.js.map "$ST_PKG/dist/"
  cp /tmp/shared-types-pkg/dist/index.d.ts "$ST_PKG/dist/"
  cp /tmp/shared-types-pkg/dist/index.d.ts.map "$ST_PKG/dist/"
  rm -rf /tmp/shared-types-pkg
  echo "✅ @ths-thm/shared-types fixed"
fi

# Pass control to the actual command
exec "$@"
