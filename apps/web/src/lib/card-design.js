/**
 * Shim agar halaman web bisa memakai `packages/card-design` (sumber tunggal desain KTA)
 * lewat alias `@/lib/card-design`. Package ini plain CJS tanpa build step.
 */
/* eslint-disable no-undef -- plain CommonJS shim; `module`/`require` are Node globals */
'use strict';
module.exports = require('../../../../packages/card-design');
