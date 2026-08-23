/**
 * Module alias resolver — registers @ths-thm/shared-types as an absolute path.
 * Loaded via Node -r flag at startup, completely bypasses node_modules resolution.
 */
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === '@ths-thm/shared-types') {
    return '/app/packages/shared-types/dist/index.js';
  }
  return origResolve.call(this, request, parent, isMain, options);
};
