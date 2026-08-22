/* eslint-env node */
/**
 * Shim agar app mobile bisa memakai `packages/card-design` (sumber tunggal desain KTA)
 * lewat alias `../lib/card-design`. Package plain CJS — Metro membundelnya langsung.
 */
'use strict';
module.exports = require('@ths-thm/card-design');
