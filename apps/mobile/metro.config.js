// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// pnpm monorepo: watch ONLY the mobile app + packages/ (sumber tunggal desain).
// Watching the whole monorepo root makes Metro scan apps/web & apps/api, which
// on Windows can hit EPERM on locked files and breaks `eas update` export.
// packages/ murni sumber (tanpa node_modules) — aman & kecil untuk di-watch.
config.watchFolders = [projectRoot, path.resolve(monorepoRoot, 'packages')];

// pnpm monorepo: resolve modules from both local and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// pnpm uses symlinks — Metro needs to follow them
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
