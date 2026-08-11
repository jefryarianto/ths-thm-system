/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Siluet peta Indonesia untuk watermark kartu anggota.
 * Di-encode sebagai data URL (base64) supaya bisa dipakai @react-pdf/renderer
 * (Image src) tanpa file eksternal.
 */

const MAP_COMMON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 180">
  <g fill="__FILL__">
    <path d="M28 20 L36 16 L44 20 L52 24 L60 34 L68 46 L74 60 L78 76 L80 94 L78 110 L72 124 L62 134 L52 138 L44 134 L40 124 L38 112 L34 98 L28 84 L24 68 L22 50 L24 34 Z"/>
    <path d="M42 146 L60 140 L80 138 L100 136 L122 138 L142 142 L152 146 L148 152 L138 154 L120 156 L100 156 L80 156 L62 156 L48 154 Z"/>
    <path d="M120 52 L140 44 L160 40 L180 44 L196 52 L206 64 L210 80 L206 98 L196 110 L180 116 L162 116 L148 110 L136 100 L128 88 L122 74 L118 62 Z"/>
    <path d="M216 60 L230 50 L244 54 L252 66 L260 78 L268 92 L272 108 L268 122 L258 130 L248 126 L242 114 L238 100 L232 86 L224 72 Z"/>
    <path d="M276 52 L288 46 L298 50 L302 62 L294 72 L282 70 L276 62 Z"/>
    <path d="M286 84 L300 80 L314 84 L320 96 L314 108 L300 112 L288 106 L282 96 Z"/>
    <path d="M330 66 L348 56 L366 52 L382 56 L392 64 L398 76 L396 90 L390 102 L376 112 L360 116 L344 114 L334 106 L328 94 L326 80 Z"/>
    <path d="M156 146 L168 142 L180 144 L186 150 L178 156 L164 156 Z"/>
    <path d="M186 146 L198 148 L208 150 L214 156 L206 160 L192 158 Z"/>
  </g>
</svg>
`;

function encode(svgWithFill: string): string {
  const encoded = Buffer.from(svgWithFill).toString('base64');
  return `data:image/svg+xml;base64,${encoded}`;
}

/** Peta Indonesia warna primary (untuk sisi depan, watermark gelap). */
export const MAP_INDONESIA_DATA_URL = encode(MAP_COMMON_SVG.replace('__FILL__', '#1e3a5f'));

/** Peta Indonesia warna terang (untuk sisi belakang, di atas background gelap). */
export const MAP_INDONESIA_LIGHT_DATA_URL = encode(MAP_COMMON_SVG.replace('__FILL__', '#cbd5e1'));