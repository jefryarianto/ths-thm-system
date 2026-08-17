/**
 * Shim agar API (PDF kartu) bisa memakai `packages/card-design` (sumber tunggal desain KTA).
 * Ditulis TS (bukan JS) supaya ikut ter-compile ke dist oleh `nest build`.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const spec = require('../../../../../packages/card-design');
export = spec;
