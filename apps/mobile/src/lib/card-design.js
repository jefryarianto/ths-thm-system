/* eslint-env node */
/**
 * SPEC DESAIN KARTU KTA (CR80 landscape 856×540) — SUMBER TUNGGAL.
 *
 * Seluruh renderer kartu — mobile (React Native), web (live tab + print preview),
 * PDF (react-pdf), dan preview HTML (`_scripts/build-card-preview.mjs`) — memakai
 * konstanta & helper dari file ini supaya layout tidak bisa melenceng satu sama lain.
 *
 * Ditulis CommonJS murni (tanpa JSX/build step) agar bisa di-`require` dari node
 * script, Metro (mobile), Next bundler (web), dan NestJS (API) tanpa instalasi.
 */

'use strict';

// ─── Ukuran kanvas kartu (CR80 landscape) ───────────────────────────────────
const CARD = Object.freeze({ W: 856, H: 540, RADIUS: 28 });

// ─── Font kartu (nama family internal file TTF — sama persis di semua platform) ───
const FONTS = Object.freeze({
  ocrA: 'OCR A Extended',
  openSansBold: 'OpenSans-Bold',
  robotoRegular: 'Roboto-Regular',
  robotoBold: 'Roboto-Bold',
});

// ─── Warna kanon ────────────────────────────────────────────────────────────
const COLORS = Object.freeze({
  front: Object.freeze({ bg: '#f7fcff', border: '#dbeafe' }),
  back: Object.freeze({ bg: '#1e40af', border: '#1e3a5f' }),
  header: Object.freeze({ from: '#2563eb', to: '#1d4ed8' }),
  bottom: Object.freeze({ from: '#93c5fd', fromOpacity: 0.8, to: '#dbeafe', toOpacity: 0.2 }),
  backGradient: Object.freeze(['#2563eb', '#1e40af', '#0f2b4a']),
  wavy: [
    { from: '#bfdbfe', fromOpacity: 0.9, to: '#e0f2fe', toOpacity: 0 },
    { from: '#93c5fd', fromOpacity: 0.6, to: '#eff6ff', toOpacity: 0 },
    { from: '#7dd3fc', fromOpacity: 0.45, to: '#f0f9ff', toOpacity: 0 },
  ],
  bgCircle1: 'rgba(6,182,212,0.15)',
  bgCircle2: 'rgba(29,78,216,0.08)',
  guillocheFront: 'rgba(29,78,216,0.3)',
  guillocheBack: 'rgba(191,219,254,0.4)',
  headerText: '#ffffff',
  label: '#1e3a5f',
  value: '#111827',
  valueStrong: '#0f2b4a',
  rankText: '#0f2b4a',
  rankStripBorder: 'rgba(0,0,0,0.25)',
  stampBorder: 'rgba(30,64,175,0.3)',
  stampText: '#1e40af',
  ttd: '#334155',
  white: '#ffffff',
});

// ─── Palet UI (Design Tokens) ────────────────────────────────────────────────
const PALETTES = Object.freeze({
  navy: {
    50: '#f0f4f8', 100: '#d9e2ec', 200: '#b6c5d8', 300: '#8da2b9',
    400: '#627d98', 500: '#486581', 600: '#334e68', 700: '#243b53',
    800: '#1A2E40', 900: '#102a43', 950: '#0a1929',
  },
  gold: {
    50: '#fdf9ef', 100: '#f9f0d4', 200: '#f0dda5', 300: '#e5c76e',
    400: '#D4AF37', 500: '#c9a22e', 600: '#a67c1e', 700: '#7d5e17',
    800: '#5a4312', 900: '#3d2e0d',
  },
});

// ─── Layout SISI DEPAN ──────────────────────────────────────────────────────
const FRONT = Object.freeze({
  header: Object.freeze({
    height: 104,
    padTop: 14,
    padBottom: 14,
    padH: 24,
    gap: 14,
    row: Object.freeze({ fontSize: 16, lineHeight: 19, spacing: [2, 1.1, 0.5, 0], rowGap: 1 }),
  }),
  logo: Object.freeze({ size: 150, radius: 75, bg: 'rgba(255,255,255,0.95)', border: 2, borderColor: '#ffffff', img: 143 }),
  photo: Object.freeze({
    big: Object.freeze({ left: 40, top: 164, w: 185, h: 235 }),
    small: Object.freeze({ right: 40, top: 154, w: 130, h: 150 }),
    crop: Object.freeze({ faceCrop: 0.6, pasfotoAspect: 0.786 }),
  }),
  rank: Object.freeze({
    right: 40, top: 316, w: 130,
    name: Object.freeze({ fontSize: 12, letterSpacing: 1, marginBottom: 3 }),
    strip: Object.freeze({ h: 9, gap: 3, radius: 3 }),
  }),
  info: Object.freeze({
    left: 250, top: 164, right: 176,
    rowMarginBottom: 13,
    label: Object.freeze({ fontSize: 12, color: COLORS.label, letterSpacing: 0.5 }),
    value: Object.freeze({ fontSize: 15, color: COLORS.value, marginTop: 3, lineHeight: 20 }),
    valueStrong: Object.freeze({ fontSize: 19, color: COLORS.valueStrong, letterSpacing: 1.2, marginTop: 3 }),
    jk: Object.freeze({ w: 44, marginLeft: 40 }),
  }),
  bottom: Object.freeze({
    left: 40, bottom: 14,
    label: Object.freeze({ fontSize: 13, color: COLORS.label, marginBottom: 2 }),
    value: Object.freeze({ fontSize: 16, color: COLORS.value, marginTop: 2 }),
  }),
  signer: Object.freeze({
    right: -8, bottom: 14, w: 400, h: 146,
    title1: Object.freeze({ left: 0, top: 35, fontSize: 13 }),
    title2: Object.freeze({ left: 0, top: 52, fontSize: 12 }),
    wrap: Object.freeze({ left: 0, top: 35, w: 175, h: 96 }),
    sig: Object.freeze({ left: -68, top: 28, w: 175, h: 60, fontSize: 26, rotate: -8, color: COLORS.ttd }),
    stamp: Object.freeze({ left: -55, top: 0, size: 110, radius: 55, border: 2, rotate: -8, text: Object.freeze({ fontSize: 11 }) }),
    name: Object.freeze({ fontSize: 14, underline: true }),
    title: Object.freeze({ fontSize: 12, marginTop: 1 }),
  }),
  watermark: Object.freeze({ left: 128, top: 166, w: 600, h: 207, color: '#1d4ed8', opacity: 0.35 }),
  bgCircle1: Object.freeze({ top: -80, right: -80, size: 320 }),
  bgCircle2: Object.freeze({ bottom: -110, left: -80, size: 380 }),
});

// ─── Layout SISI BELAKANG ───────────────────────────────────────────────────
const BACK = Object.freeze({
  title: Object.freeze({ top: 28, fontSize: 28, letterSpacing: 3, subtitle: Object.freeze({ fontSize: 15, marginTop: 4 }) }),
  qr: Object.freeze({ left: 48, top: 145, size: 210, radius: 16, border: 4, borderColor: '#1e3a5f', bg: '#ffffff', padding: 16 }),
  info: Object.freeze({
    left: 300, top: 145, right: 48, padding: 24,
    desc: Object.freeze({ fontSize: 18, lineHeight: 27, marginBottom: 16, opacity: 0.95 }),
    row: Object.freeze({ marginBottom: 12, label: Object.freeze({ w: 115, fontSize: 18 }), colon: Object.freeze({ w: 18 }), value: Object.freeze({ fontSize: 17 }) }),
  }),
  footer: Object.freeze({
    left: 48, right: 48, bottom: 32,
    text: Object.freeze({ fontSize: 15, lineHeight: 22, opacity: 0.95 }),
    urlLabel: Object.freeze({ fontSize: 13, opacity: 0.8 }),
    urlValue: Object.freeze({ fontSize: 16, marginTop: 2 }),
  }),
  watermark: Object.freeze({ w: 480, h: 166, color: '#ffffff', opacity: 0.5 }),
});

// ─── Dekorasi (SVG): jalur & gradien kanon — dipakai mobile, web, dan preview ───
const DECOR = Object.freeze({
  wavyPaths: [
    'M-60 110 C 140 30, 320 200, 500 110 S 780 20, 916 100 L 916 560 L -60 560 Z',
    'M-40 300 C 180 200, 380 380, 560 300 S 780 220, 900 290 L 900 560 L -40 560 Z',
    'M-60 440 C 150 350, 340 530, 540 440 S 790 370, 916 440 L 916 560 L -60 560 Z',
  ],
  headerPath: 'M0 0 H856 V104 H0 Z',
  bottomPath: 'M0 462 C 140 436, 300 476, 470 450 S 720 424, 856 452 L 856 540 L 0 540 Z',
  backWave: 'M-40 170 C 160 90, 340 240, 520 170 S 780 90, 920 170 L 920 540 L -40 540 Z',
  guilloche: Object.freeze({
    inset: 16,
    rects: [
      { inset: 16, rx: 22, strokeWidth: 1.2, opacity: 0.45, dash: null },
      { inset: 22, rx: 18, strokeWidth: 0.8, opacity: 0.35, dash: '3 5' },
      { inset: 27, rx: 14, strokeWidth: 0.5, opacity: 0.2, dash: null },
    ],
    pattern: Object.freeze({ w: 18, h: 18, path: 'M0 9 Q4.5 0 9 9 T18 9', strokeWidth: 0.5 }),
  }),
});

/** SVG dekorasi sisi depan (ombak + header + gradien bawah) — satu <svg> utuh. */
function decorFrontSvg() {
  const stops = COLORS.wavy
    .map(
      (w, i) =>
        `<linearGradient id="cd-w${i + 1}" x1="${i === 2 ? '0' : i === 1 ? '1' : '0'}" y1="${i === 2 ? '1' : '0'}" x2="${i === 2 ? '1' : i === 1 ? '0.4' : '0.6'}" y2="${i === 2 ? '0' : '1'}"><stop offset="0" stop-color="${w.from}" stop-opacity="${w.fromOpacity}"/><stop offset="1" stop-color="${w.to}" stop-opacity="${w.toOpacity}"/></linearGradient>`,
    )
    .join('');
  return (
    `<svg class="decor" width="${CARD.W}" height="${CARD.H}" viewBox="0 0 ${CARD.W} ${CARD.H}" aria-hidden="true"><defs>${stops}` +
    `<linearGradient id="cd-head" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COLORS.header.from}"/><stop offset="1" stop-color="${COLORS.header.to}"/></linearGradient>` +
    `<linearGradient id="cd-bot" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COLORS.bottom.from}" stop-opacity="${COLORS.bottom.fromOpacity}"/><stop offset="1" stop-color="${COLORS.bottom.to}" stop-opacity="${COLORS.bottom.toOpacity}"/></linearGradient>` +
    `</defs>` +
    DECOR.wavyPaths.map((d, i) => `<path d="${d}" fill="url(#cd-w${i + 1})"/>`).join('') +
    `<path d="${DECOR.headerPath}" fill="url(#cd-head)"/>` +
    `<path d="${DECOR.bottomPath}" fill="url(#cd-bot)"/>` +
    `</svg>`
  );
}

/** SVG dekorasi sisi belakang (gradien + ombak putih) — satu <svg> utuh. */
function decorBackSvg() {
  const stops = COLORS.backGradient
    .map(
      (c, i) =>
        `<stop offset="${i === 0 ? '0' : i === 1 ? '0.5' : '1'}" stop-color="${c}"/>`,
    )
    .join('');
  return (
    `<svg class="decor" width="${CARD.W}" height="${CARD.H}" viewBox="0 0 ${CARD.W} ${CARD.H}" aria-hidden="true"><defs>` +
    `<linearGradient id="cd-back" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs>` +
    `<rect x="0" y="0" width="${CARD.W}" height="${CARD.H}" fill="url(#cd-back)"/>` +
    `<path d="${DECOR.backWave}" fill="#ffffff" opacity="0.06"/>` +
    `</svg>`
  );
}

/** SVG guilloche border — warna stroke mengikuti sisi (front/back). */
function guillocheSvg(side, strokeColor) {
  const stroke = strokeColor || (side === 'back' ? COLORS.guillocheBack : COLORS.guillocheFront);
  const rects = DECOR.guilloche.rects
    .map(
      (r) =>
        `<rect x="${r.inset}" y="${r.inset}" width="${CARD.W - r.inset * 2}" height="${CARD.H - r.inset * 2}" rx="${r.rx}" fill="none" stroke="${stroke}" stroke-width="${r.strokeWidth}"${r.dash ? ` stroke-dasharray="${r.dash}"` : ''} opacity="${r.opacity}"/>`,
    )
    .join('');
  return (
    `<svg class="guilloche" width="${CARD.W}" height="${CARD.H}" viewBox="0 0 ${CARD.W} ${CARD.H}" aria-hidden="true"><defs>` +
    `<pattern id="cd-g-${side}" x="0" y="0" width="${DECOR.guilloche.pattern.w}" height="${DECOR.guilloche.pattern.h}" patternUnits="userSpaceOnUse"><path d="${DECOR.guilloche.pattern.path}" fill="none" stroke="${stroke}" stroke-width="${DECOR.guilloche.pattern.strokeWidth}"/></pattern></defs>` +
    rects +
    `<rect x="16" y="16" width="${CARD.W - 32}" height="${CARD.H - 32}" rx="22" fill="none" stroke="url(#cd-g-${side})" stroke-width="14" opacity="0.5"/>` +
    `</svg>`
  );
}

// ─── Layout LAYAR KAMERA (overlay panduan wajah ala SIM) ───────────────────
const CAMERA = Object.freeze({
  overlay: Object.freeze({
    dimColor: 'rgba(0,0,0,0.5)',
    dimTop: 1.1,
    dimSide: 1,
    dimBottom: 1.4,
    guide: Object.freeze({ w: 250, h: 320 }),
    oval: Object.freeze({
      w: 250,
      h: 300,
      radius: 150,
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.95)',
      glow: '#60a5fa',
    }),
    corner: Object.freeze({ size: 28, color: '#93c5fd', width: 4, radius: 10, offset: 6 }),
  }),
  hint: Object.freeze({
    top: 90,
    left: 24,
    right: 24,
    radius: 20,
    bg: 'rgba(0,0,0,0.45)',
    padV: 10,
    padH: 16,
    text: 'Posisikan wajah di dalam oval, bahu di bawah garis',
  }),
  flash: Object.freeze({ top: 64, right: 20, size: 44, radius: 22, bg: 'rgba(0,0,0,0.5)' }),
  close: Object.freeze({ top: 60, left: 16, size: 44, radius: 22, bg: 'rgba(0,0,0,0.5)' }),
  capture: Object.freeze({
    size: 76,
    radius: 38,
    borderWidth: 4,
    borderColor: '#ffffff',
    inner: 60,
    innerRadius: 30,
    innerColor: '#ffffff',
  }),
  bottomBar: Object.freeze({ bottom: 40 }),
  uploading: Object.freeze({ marginTop: 10, fontSize: 13, color: '#ffffff' }),
});

// ─── Tingkat → visual balok (sesuai tabel pengaturan tingkatan) ────────────
const LEVELS = Object.freeze({
  Anggota: Object.freeze({ stripCount: 0, color: '#94a3b8', label: 'Tanpa strip' }),
  Pratama: Object.freeze({ stripCount: 1, color: '#1d4ed8', label: 'Biru 1' }),
  Tamtama: Object.freeze({ stripCount: 2, color: '#1d4ed8', label: 'Biru 2' }),
  Muda: Object.freeze({ stripCount: 1, color: '#ca8a04', label: 'Kuning 1' }),
  Madya: Object.freeze({ stripCount: 2, color: '#ca8a04', label: 'Kuning 2' }),
  Utama: Object.freeze({ stripCount: 3, color: '#ca8a04', label: 'Kuning 3' }),
});

/** Resolve visual tingkat: prioritas dari API (tabel pengaturan), fallback ke LEVELS. */
function getLevelVisual(tingkat, fromApi) {
  if (fromApi) return { stripCount: fromApi.stripCount, color: fromApi.color, label: fromApi.label || 'Strip' };
  return (tingkat && LEVELS[tingkat]) || { stripCount: 0, color: '#94a3b8', label: 'Tanpa strip' };
}

/**
 * Crop foto wajah ala SIM: region atas pasfoto (kepala + bahu) memenuhi kotak foto.
 * Mengembalikan ukuran & offset gambar mentah di dalam kotak `boxW × boxH`.
 */
function photoCrop(boxW, boxH) {
  const h = Math.round(boxH / FRONT.photo.crop.faceCrop);
  const w = Math.round(h * FRONT.photo.crop.pasfotoAspect);
  return { w, h, left: Math.round((boxW - w) / 2), top: 0 };
}

// ─── Helper format data (sama di semua renderer) ───────────────────────────
const fmt = {
  ttl(tempatLahir, tanggalLahir) {
    return [tempatLahir || '-', tanggalLahir ? fmt.dateId(tanggalLahir) : '-'].filter(Boolean).join(', ');
  },
  dadar(tempatDadar, tahunDadar) {
    return [tempatDadar, tahunDadar].filter(Boolean).join(', ') || '-';
  },
  dateId(d) {
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  },
  validUntilDate(base = new Date()) {
    const d = new Date(base);
    d.setFullYear(d.getFullYear() + 5);
    return d;
  },
  validUntilText(base = new Date()) {
    return fmt.dateId(fmt.validUntilDate(base));
  },
};

// ─── CSS untuk renderer DOM (web print preview & preview HTML) ─────────────
function cardCss() {
  const f = FRONT;
  const b = BACK;
  return `
.card { width: ${CARD.W}px; height: ${CARD.H}px; border-radius: ${CARD.RADIUS}px; overflow: hidden; position: relative; }
.card.front { background: ${COLORS.front.bg}; border: 1px solid ${COLORS.front.border}; }
.card.back { background: ${COLORS.back.bg}; border: 1px solid ${COLORS.back.border}; }
.card .decor, .card .guilloche, .card .abs { position: absolute; }
.card .bg-circle1 { position: absolute; top: ${f.bgCircle1.top}px; right: ${f.bgCircle1.right}px; width: ${f.bgCircle1.size}px; height: ${f.bgCircle1.size}px; border-radius: ${f.bgCircle1.size / 2}px; background: ${COLORS.bgCircle1}; }
.card .bg-circle2 { position: absolute; bottom: ${f.bgCircle2.bottom}px; left: ${f.bgCircle2.left}px; width: ${f.bgCircle2.size}px; height: ${f.bgCircle2.size}px; border-radius: ${f.bgCircle2.size / 2}px; background: ${COLORS.bgCircle2}; }
.card .watermark { position: absolute; pointer-events: none; -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; }
.card .watermark.front { left: ${f.watermark.left}px; top: ${f.watermark.top}px; width: ${f.watermark.w}px; height: ${f.watermark.h}px; opacity: ${f.watermark.opacity}; background: ${f.watermark.color}; }
.card .watermark.back { width: ${b.watermark.w}px; height: ${b.watermark.h}px; opacity: ${b.watermark.opacity}; background: ${b.watermark.color}; top: ${(CARD.H - b.watermark.h) / 2}px; left: ${(CARD.W - b.watermark.w) / 2}px; }
.card .header-row { position: absolute; top: 0; left: 0; right: 0; padding: ${f.header.padTop}px ${f.header.padH}px; display: flex; gap: ${f.header.gap}px; align-items: flex-start; }
.card .logo { width: ${f.logo.size}px; height: ${f.logo.size}px; border-radius: ${f.logo.radius}px; background: ${f.logo.bg}; border: ${f.logo.border}px solid ${f.logo.borderColor}; overflow: hidden; display: flex; align-items: center; justify-content: center; flex: none; }
.card .logo img { width: ${f.logo.img}px; height: ${f.logo.img}px; }
.card .header-text { flex: 1; font-size: ${f.header.row.fontSize}px; font-weight: 900; color: ${COLORS.headerText}; line-height: ${f.header.row.lineHeight}px; }
.card .header-text div { margin-top: ${f.header.row.rowGap}px; }
.card .header-text div:first-child { margin-top: 0; }
.card .header-text .r1 { letter-spacing: ${f.header.row.spacing[0]}px; }
.card .header-text .r2 { letter-spacing: ${f.header.row.spacing[1]}px; }
.card .header-text .r3 { letter-spacing: ${f.header.row.spacing[2]}px; }
.card .photo-slot { overflow: hidden; display: flex; align-items: center; justify-content: center; }
.card .photo-slot img { position: absolute; object-fit: cover; }
.card .photo-big { position: absolute; left: ${f.photo.big.left}px; top: ${f.photo.big.top}px; width: ${f.photo.big.w}px; height: ${f.photo.big.h}px; }
.card .photo-small { position: absolute; right: ${f.photo.small.right}px; top: ${f.photo.small.top}px; width: ${f.photo.small.w}px; height: ${f.photo.small.h}px; }
.card .rank-box { position: absolute; right: ${f.rank.right}px; top: ${f.rank.top}px; width: ${f.rank.w}px; text-align: center; }
.card .rank-name { font-size: ${f.rank.name.fontSize}px; font-weight: 900; color: ${COLORS.rankText}; letter-spacing: ${f.rank.name.letterSpacing}px; margin-bottom: ${f.rank.name.marginBottom}px; }
.card .rank-strips { display: flex; flex-direction: column; gap: ${f.rank.strip.gap}px; }
.card .rank-strip { height: ${f.rank.strip.h}px; width: 100%; border-radius: ${f.rank.strip.radius}px; border: 1px solid ${COLORS.rankStripBorder}; }
.card .info { position: absolute; left: ${f.info.left}px; top: ${f.info.top}px; right: ${f.info.right}px; z-index: 20; }
.card .info-row { margin-bottom: ${f.info.rowMarginBottom}px; }
.card .info-label { font-size: ${f.info.label.fontSize}px; font-weight: 800; color: ${f.info.label.color}; text-transform: uppercase; letter-spacing: ${f.info.label.letterSpacing}px; }
.card .info-value { font-size: ${f.info.value.fontSize}px; font-weight: 700; color: ${f.info.value.color}; margin-top: ${f.info.value.marginTop}px; line-height: ${f.info.value.lineHeight}px; text-shadow: 0 0 1.5px ${f.info.value.color}; }
.card .info-value.strong { font-size: ${f.info.valueStrong.fontSize}px; color: ${f.info.valueStrong.color}; letter-spacing: ${f.info.valueStrong.letterSpacing}px; margin-top: ${f.info.valueStrong.marginTop}px; text-shadow: 0 0 2px ${f.info.valueStrong.color}; }
.card .info-pair { display: flex; }
.card .info-pair-left { flex: 1; min-width: 0; }
.card .jk-box { width: ${f.info.jk.w}px; margin-left: ${f.info.jk.marginLeft}px; }
.card .bottom-info { position: absolute; left: ${f.bottom.left}px; bottom: ${f.bottom.bottom}px; }
.card .bottom-label { font-size: ${f.bottom.label.fontSize}px; font-weight: 700; color: ${f.bottom.label.color}; margin-bottom: ${f.bottom.label.marginBottom}px; }
.card .bottom-value { font-size: ${f.bottom.value.fontSize}px; font-weight: 700; color: ${f.bottom.value.color}; margin-top: ${f.bottom.value.marginTop}px; }
.card .signer { position: absolute; right: ${f.signer.right}px; bottom: ${f.signer.bottom}px; width: ${f.signer.w}px; height: ${f.signer.h}px; }
.card .sig-title1 { position: absolute; left: ${f.signer.title1.left}px; top: ${f.signer.title1.top}px; font-size: ${f.signer.title1.fontSize}px; font-weight: 900; color: ${COLORS.value}; }
.card .sig-title2 { position: absolute; left: ${f.signer.title2.left}px; top: ${f.signer.title2.top}px; font-size: ${f.signer.title2.fontSize}px; font-weight: 700; color: ${COLORS.value}; }
.card .sig-wrap { position: absolute; left: ${f.signer.wrap.left}px; top: ${f.signer.wrap.top}px; width: ${f.signer.wrap.w}px; height: ${f.signer.wrap.h}px; }
.card .sig-text { position: absolute; left: ${f.signer.sig.left}px; top: ${f.signer.sig.top}px; width: ${f.signer.sig.w}px; height: ${f.signer.sig.h}px; font-size: ${f.signer.sig.fontSize}px; font-style: italic; color: ${f.signer.sig.color}; transform: rotate(${f.signer.sig.rotate}deg); }
.card .stamp { position: absolute; left: ${f.signer.stamp.left}px; top: ${f.signer.stamp.top}px; width: ${f.signer.stamp.size}px; height: ${f.signer.stamp.size}px; border-radius: ${f.signer.stamp.radius}px; border: ${f.signer.stamp.border}px solid ${COLORS.stampBorder}; display: flex; align-items: center; justify-content: center; transform: rotate(${f.signer.stamp.rotate}deg); overflow: hidden; font-size: ${f.signer.stamp.text.fontSize}px; font-weight: 900; color: ${COLORS.stampText}; }
.card .stamp img { width: 100%; height: 100%; object-fit: cover; }
.card .signer-row { position: absolute; left: 0; bottom: 0; z-index: 5; width: 100%; }
.card .signer-name { font-size: ${f.signer.name.fontSize}px; font-weight: 900; color: ${COLORS.value}; text-decoration: underline; }
.card .signer-title { font-size: ${f.signer.title.fontSize}px; font-weight: 700; color: ${COLORS.value}; margin-top: ${f.signer.title.marginTop}px; }
.card .back-title { position: absolute; top: ${b.title.top}px; left: 0; right: 0; text-align: center; }
.card .back-title .t { font-size: ${b.title.fontSize}px; font-weight: 900; color: ${COLORS.white}; letter-spacing: ${b.title.letterSpacing}px; }
.card .back-title .s { font-size: ${b.title.subtitle.fontSize}px; color: ${COLORS.white}; opacity: 0.9; margin-top: ${b.title.subtitle.marginTop}px; }
.card .qr-box { position: absolute; left: ${b.qr.left}px; top: ${b.qr.top}px; width: ${b.qr.size}px; height: ${b.qr.size}px; background: ${b.qr.bg}; border-radius: ${b.qr.radius}px; border: ${b.qr.border}px solid ${b.qr.borderColor}; padding: ${b.qr.padding}px; display: flex; align-items: center; justify-content: center; }
.card .qr-box img { width: 100%; height: 100%; }
.card .back-info { position: absolute; left: ${b.info.left}px; top: ${b.info.top}px; right: ${b.info.right}px; padding: ${b.info.padding}px; }
.card .back-desc { font-size: ${b.info.desc.fontSize}px; line-height: ${b.info.desc.lineHeight}px; color: ${COLORS.white}; opacity: ${b.info.desc.opacity}; margin-bottom: ${b.info.desc.marginBottom}px; }
.card .back-row { display: flex; align-items: center; margin-bottom: ${b.info.row.marginBottom}px; }
.card .back-row .lbl { width: ${b.info.row.label.w}px; font-size: ${b.info.row.label.fontSize}px; font-weight: 700; color: ${COLORS.white}; text-transform: uppercase; }
.card .back-row .colon { width: ${b.info.row.colon.w}px; font-size: ${b.info.row.label.fontSize}px; font-weight: 700; color: ${COLORS.white}; opacity: 0.9; }
.card .back-row .val { flex: 1; font-size: ${b.info.row.value.fontSize}px; font-weight: 600; color: ${COLORS.white}; }
.card .back-footer { position: absolute; left: ${b.footer.left}px; right: ${b.footer.right}px; bottom: ${b.footer.bottom}px; display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
.card .footer-text { flex: 1; font-size: ${b.footer.text.fontSize}px; line-height: ${b.footer.text.lineHeight}px; color: #f0f9ff; opacity: ${b.footer.text.opacity}; }
.card .footer-url { text-align: right; }
.card .footer-url .u { font-size: ${b.footer.urlLabel.fontSize}px; color: #f0f9ff; opacity: ${b.footer.urlLabel.opacity}; text-transform: uppercase; }
.card .footer-url .v { font-size: ${b.footer.urlValue.fontSize}px; font-weight: 700; color: ${COLORS.white}; margin-top: ${b.footer.urlValue.marginTop}px; }
`;
}

/** CSS overlay kamera (web/preview) — nilai ditarik dari CAMERA. */
function cameraOverlayCss() {
  const c = CAMERA;
  return `
.cam-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; pointer-events: none; }
.cam-dim-top { flex: ${c.overlay.dimTop}; background: ${c.overlay.dimColor}; }
.cam-dim-row { display: flex; }
.cam-dim-side { flex: ${c.overlay.dimSide}; background: ${c.overlay.dimColor}; }
.cam-dim-bottom { flex: ${c.overlay.dimBottom}; background: ${c.overlay.dimColor}; }
.cam-guide { width: ${c.overlay.guide.w}px; height: ${c.overlay.guide.h}px; display: flex; align-items: center; justify-content: center; position: relative; }
.cam-oval { width: ${c.overlay.oval.w}px; height: ${c.overlay.oval.h}px; border-radius: ${c.overlay.oval.radius}px; border: ${c.overlay.oval.borderWidth}px solid ${c.overlay.oval.borderColor}; box-shadow: 0 0 12px ${c.overlay.oval.glow}; }
.cam-corner { position: absolute; width: ${c.overlay.corner.size}px; height: ${c.overlay.corner.size}px; border-color: ${c.overlay.corner.color}; }
.cam-corner.tl { top: -${c.overlay.corner.offset}px; left: -${c.overlay.corner.offset}px; border-top: ${c.overlay.corner.width}px solid; border-left: ${c.overlay.corner.width}px solid; border-top-left-radius: ${c.overlay.corner.radius}px; }
.cam-corner.tr { top: -${c.overlay.corner.offset}px; right: -${c.overlay.corner.offset}px; border-top: ${c.overlay.corner.width}px solid; border-right: ${c.overlay.corner.width}px solid; border-top-right-radius: ${c.overlay.corner.radius}px; }
.cam-corner.bl { bottom: -${c.overlay.corner.offset}px; left: -${c.overlay.corner.offset}px; border-bottom: ${c.overlay.corner.width}px solid; border-left: ${c.overlay.corner.width}px solid; border-bottom-left-radius: ${c.overlay.corner.radius}px; }
.cam-corner.br { bottom: -${c.overlay.corner.offset}px; right: -${c.overlay.corner.offset}px; border-bottom: ${c.overlay.corner.width}px solid; border-right: ${c.overlay.corner.width}px solid; border-bottom-right-radius: ${c.overlay.corner.radius}px; }
.cam-hint { position: absolute; top: ${c.hint.top}px; left: ${c.hint.left}px; right: ${c.hint.right}px; display: flex; align-items: center; justify-content: center; gap: 8px; background: ${c.hint.bg}; border-radius: ${c.hint.radius}px; padding: ${c.hint.padV}px ${c.hint.padH}px; color: #fff; font-size: 13px; font-weight: 600; text-align: center; }
.cam-flash { position: absolute; top: ${c.flash.top}px; right: ${c.flash.right}px; width: ${c.flash.size}px; height: ${c.flash.size}px; border-radius: ${c.flash.radius}px; background: ${c.flash.bg}; }
.cam-close { position: absolute; top: ${c.close.top}px; left: ${c.close.left}px; width: ${c.close.size}px; height: ${c.close.size}px; border-radius: ${c.close.radius}px; background: ${c.close.bg}; }
.cam-bottom { position: absolute; bottom: ${c.bottomBar.bottom}px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; }
.cam-capture { width: ${c.capture.size}px; height: ${c.capture.size}px; border-radius: ${c.capture.radius}px; border: ${c.capture.borderWidth}px solid ${c.capture.borderColor}; display: flex; align-items: center; justify-content: center; background: transparent; cursor: pointer; }
.cam-capture-inner { width: ${c.capture.inner}px; height: ${c.capture.inner}px; border-radius: ${c.capture.innerRadius}px; background: ${c.capture.innerColor}; }
.cam-uploading { color: ${c.uploading.color}; margin-top: ${c.uploading.marginTop}px; font-size: ${c.uploading.fontSize}px; font-weight: 600; }
`;
}

/**
 * Resolve spec runtime kartu dari template aktif (dari DB / card-templates API).
 * Template null/kosong → spec bawaan utuh (backward compatible — semua renderer
 * tetap tampil persis seperti sebelumnya).
 *
 * Yang bisa diganti oleh template (overlayConfig di DB):
 * - Latar sisi depan/belakang: gambar upload (frontImage/backImage) menggantikan
 *   dekorasi SVG bawaan (ombak/gradien) — guilloche & watermark jadi layer opsional.
 * - Toggle + warna stroke guilloche dan opacity watermark.
 * - Warna teks per elemen data (nama, nomorAnggota, ttl, ranting, wilayah, tingkat, ttd).
 *
 * Geometri layout (posisi elemen) TIDAK diubah oleh template — renderer tetap
 * memakai FRONT/BACK kanon agar mobile/web/PDF tidak melenceng satu sama lain.
 */
function resolveCardSpec(activeTemplate) {
  const overlay = (activeTemplate && activeTemplate.overlayConfig) || {};
  const g = overlay.guilloche || {};
  const wm = overlay.watermark || {};

  const textColors = {};
  for (const key of ['nama', 'nomorAnggota', 'ttl', 'ranting', 'wilayah', 'tingkat', 'ttd']) {
    const el = overlay[key];
    if (el && typeof el.color === 'string' && el.color) textColors[key] = el.color;
  }

  return {
    /** Template sumber (null = desain bawaan). */
    template: activeTemplate
      ? {
          id: activeTemplate.id || null,
          name: activeTemplate.name || null,
          label: activeTemplate.label || null,
          frontImage: activeTemplate.frontImage || null,
          backImage: activeTemplate.backImage || null,
        }
      : null,
    hasFrontImage: Boolean(activeTemplate && activeTemplate.frontImage),
    hasBackImage: Boolean(activeTemplate && activeTemplate.backImage),
    guilloche: {
      front: g.enabledFront !== false,
      back: g.enabledBack !== false,
      strokeFront: typeof g.strokeFront === 'string' && g.strokeFront ? g.strokeFront : COLORS.guillocheFront,
      strokeBack: typeof g.strokeBack === 'string' && g.strokeBack ? g.strokeBack : COLORS.guillocheBack,
    },
    watermark: {
      front: wm.enabledFront !== false,
      back: wm.enabledBack !== false,
      opacity: typeof wm.opacity === 'number' ? wm.opacity : null,
    },
    textColors,
  };
}

module.exports = {
  CARD,
  CAMERA,
  FONTS,
  COLORS,
  PALETTES,
  FRONT,
  BACK,
  DECOR,
  LEVELS,
  getLevelVisual,
  photoCrop,
  fmt,
  decorFrontSvg,
  decorBackSvg,
  guillocheSvg,
  cardCss,
  cameraOverlayCss,
  resolveCardSpec,
};