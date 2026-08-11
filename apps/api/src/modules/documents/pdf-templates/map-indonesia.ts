/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Siluet peta Indonesia untuk watermark kartu anggota.
 * Di-encode sebagai data URL (base64) supaya bisa dipakai @react-pdf/renderer
 * (Image src) tanpa file eksternal.
 */

const MAP_COMMON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 180">
  <g fill="__FILL__">
    <path d="M30 12 L22 16 L18 24 L18 34 L22 44 L28 54 L34 64 L38 76 L40 90 L40 104 L38 116 L34 126 L28 134 L20 138 L14 132 L12 122 L14 110 L20 100 L24 88 L24 74 L22 60 L18 48 L16 36 L20 24 L26 16 Z"/>
    <path d="M52 134 L68 130 L86 128 L104 130 L120 132 L136 136 L150 140 L162 144 L168 148 L170 152 L166 158 L152 160 L136 160 L118 158 L100 156 L84 156 L68 154 L56 150 L50 144 Z"/>
    <path d="M176 142 L184 139 L192 141 L196 146 L192 151 L184 153 L178 150 Z"/>
    <path d="M202 142 L210 140 L216 142 L218 147 L212 152 L206 150 Z"/>
    <path d="M222 141 L232 139 L242 141 L248 145 L246 150 L238 151 L228 150 L222 147 Z"/>
    <path d="M252 140 L262 138 L274 140 L280 144 L278 150 L268 151 L258 150 L252 146 Z"/>
    <path d="M284 136 L296 134 L308 136 L314 140 L312 147 L300 150 L288 149 L282 144 Z"/>
    <path d="M116 50 L130 40 L148 36 L166 38 L182 42 L194 50 L202 60 L206 72 L204 86 L198 98 L188 108 L174 113 L160 112 L146 107 L134 98 L124 86 L118 72 L114 60 Z"/>
    <path d="M240 38 L250 44 L256 54 L260 66 L264 78 L268 90 L278 94 L282 102 L276 110 L266 112 L262 120 L256 130 L248 134 L240 130 L234 122 L228 110 L222 98 L220 84 L222 70 L226 56 L232 44 Z"/>
    <path d="M288 50 L298 46 L310 50 L318 56 L322 64 L316 72 L306 72 L296 68 L290 60 Z"/>
    <path d="M296 82 L308 78 L320 82 L328 92 L324 102 L312 108 L302 104 L294 96 L292 88 Z"/>
    <path d="M332 52 L342 48 L352 46 L362 48 L372 52 L382 58 L390 66 L396 76 L398 88 L396 100 L388 110 L376 116 L362 118 L348 114 L336 108 L326 98 L322 88 L322 76 L326 64 Z"/>
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