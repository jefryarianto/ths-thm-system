#!/usr/bin/env node

/**
 * Bump the runtimeVersion in apps/mobile/app.json
 *
 * Usage:
 *   node scripts/bump-runtime-version.js              # bump patch: 1.0.0 → 1.0.1
 *   node scripts/bump-runtime-version.js minor         # bump minor: 1.0.0 → 1.1.0
 *   node scripts/bump-runtime-version.js major         # bump major: 1.0.0 → 2.0.0
 *   node scripts/bump-runtime-version.js 1.2.3         # set explicit version
 */

const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, '..', 'apps', 'mobile', 'app.json');

function parseVersion(v) {
  const parts = v.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: "${v}". Expected "X.Y.Z"`);
  }
  return { major: parts[0], minor: parts[1], patch: parts[2] };
}

function bumpVersion(current, mode) {
  const v = parseVersion(current);

  switch (mode) {
    case 'major':
      return `${v.major + 1}.0.0`;
    case 'minor':
      return `${v.major}.${v.minor + 1}.0`;
    case 'patch':
    default:
      if (['major', 'minor', 'patch'].includes(mode)) {
        return `${v.major}.${v.minor}.${v.patch + 1}`;
      }
      // Assume it's an explicit version string
      parseVersion(mode); // validate
      return mode;
  }
}

function main() {
  const mode = process.argv[2] || 'patch';

  // Read app.json
  const raw = fs.readFileSync(APP_JSON_PATH, 'utf-8');
  const appJson = JSON.parse(raw);

  const currentVersion = appJson.expo?.runtimeVersion;
  if (!currentVersion || typeof currentVersion !== 'string') {
    console.error(`Error: runtimeVersion is "${currentVersion}" (expected string).`);
    console.error('For bare workflow, runtimeVersion must be a static string like "1.0.0".');
    process.exit(1);
  }

  const newVersion = bumpVersion(currentVersion, mode);

  // Update
  appJson.expo.runtimeVersion = newVersion;

  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n');

  console.log(`✅ runtimeVersion bumped: ${currentVersion} → ${newVersion}`);
  console.log(`   File: ${APP_JSON_PATH}`);
}

main();
