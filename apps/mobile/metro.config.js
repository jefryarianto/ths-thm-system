// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// pnpm monorepo: watch the entire workspace root
config.watchFolders = [monorepoRoot];

// pnpm monorepo: resolve modules from both local and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// pnpm uses symlinks — Metro needs to follow them
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
