/**
 * Shim agar halaman web bisa memakai `packages/card-design` (sumber tunggal desain KTA)
 * lewat alias `@/lib/card-design`. Package ini plain CJS tanpa build step.
 */
'use strict';
module.exports = require('../../../../packages/card-design');
