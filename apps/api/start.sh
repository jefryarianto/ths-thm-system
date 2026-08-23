#!/bin/sh
# Startup wrapper: verify module resolution before launching the app.
# This catches MODULE_NOT_FOUND errors with full diagnostic output.
set -e

echo "🔍 Checking module resolution..."
node -e "
  var modules = ['class-validator', 'class-transformer', '@nestjs/swagger', '@ths-thm/shared-types', 'zod'];
  var ok = true;
  modules.forEach(function(m) {
    try { require(m); console.log('  ✅ ' + m); }
    catch(e) { console.error('  ❌ ' + m + ': ' + e.message); ok = false; }
  });
  if (!ok) { console.error('Module check failed!'); process.exit(1); }
  console.log('All modules OK, starting app...');
" || {
  echo "❌ Module resolution check failed. Aborting."
  exit 1
}

exec node dist/main.js
