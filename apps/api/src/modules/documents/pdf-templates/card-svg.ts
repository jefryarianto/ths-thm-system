/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Renderer SVG kartu KTA (856×1080: depan di atas, belakang di bawah).
 *
 * PNG dari endpoint `/digital-card/image` dihasilkan lewat jalur SVG → sharp
 * (murni Node, tanpa binary eksternal) sehingga SELALU menghasilkan PNG valid,
 * tidak bisa "kosong" seperti jalur PDF→poppler bila poppler/pdf-poppler bermasalah.
 *
 * Geometri & warna ditarik 100% dari packages/card-design (sumber tunggal) —
 * sinkron dengan mobile/web/PDF.
 */
const {
  CARD,
  COLORS,
  FRONT,
  BACK,
  PATTERN,
  FONTS,
  getLevelVisual,
  fmt,
  patternRows,
  decorFrontSvg,
  decorBackSvg,
  guillocheSvg,
} = require('../../../common/utils/card-design');
const { KTA_LOGO_DATA_URL } = require('./kta-logo');
const { PLUS_JAKARTA_FONT_CSS } = require('./plus-jakarta-font');

// Semua family lama dipetakan ke Plus Jakarta Sans agar SVG, PNG, PDF, dan web
// memakai satu family yang sama. Bobot regular/semi-bold/bold dipilih lewat
// atribut font-weight pada SVG.
const FAM: Record<string, string> = {
  [FONTS.robotoBold]: FONTS.plusJakarta,
  [FONTS.robotoRegular]: FONTS.plusJakarta,
  [FONTS.openSansBold]: FONTS.plusJakarta,
  [FONTS.ocrA]: FONTS.plusJakarta,
  [FONTS.plusJakarta]: FONTS.plusJakarta,
};
const fam = (name: string) => FAM[name] ?? FONTS.plusJakarta;

export interface CardSvgData {
  member: {
    namaLengkap: string;
    nomorAnggota: string;
    jenisKelamin: string;
    tempatLahir?: string | null;
    tanggalLahir?: string | null;
    tingkat?: string | null;
    tempatDadar?: string | null;
    tahunDadar?: string | null;
    pekerjaan?: string | null;
    pelantikan?: string | null;
    ranting?: string | null;
    wilayah?: string | null;
    distrik?: string | null;
    alamatDistrik?: string | null;
    statusKeanggotaan: string;
  };
  nomorDokumen: string;
  qrDataUrl: string;
  verificationUrl: string;
  /** Penandatangan kartu (1-3 orang). Jika kosong, pakai signerName/signerTitle. */
  signers?: Array<{ signerName?: string; signerTitle?: string }>;
  signerName?: string;
  signerTitle?: string;
  photoDataUrl?: string | null;
  signatureDataUrl?: string | null;
  stampDataUrl?: string | null;
  frontImageDataUrl?: string | null;
  backImageDataUrl?: string | null;
  levelVisual?: { stripCount: number; color: string; label?: string } | null;
  /** Template kartu aktif (desain upload). */
  template?: {
    frontImage?: string | null;
    backImage?: string | null;
    overlayConfig?: {
      guilloche?: {
        enabledFront?: boolean;
        enabledBack?: boolean;
        strokeFront?: string;
        strokeBack?: string;
      };
    } | null;
  } | null;
}

const esc = (s: unknown): string =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const truncate = (s: string, max: number): string => {
  const chars = Array.from(String(s || ''));
  return chars.length > max ? `${chars.slice(0, Math.max(0, max - 1)).join('')}…` : String(s || '');
};

/** Ambil isi luar <svg>…</svg> agar bisa disisipkan sebagai <g> di dalam dokumen besar. */
function svgInner(str: string): string {
  return str.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
}

/** Teks SVG dengan font/bobot sesuai spec (family default = Plus Jakarta Sans). */
function txt(
  x: number,
  y: number,
  content: string,
  o: {
    size?: number;
    weight?: number;
    fill?: string;
    anchor?: 'start' | 'middle' | 'end';
    spacing?: number;
    style?: string;
    transform?: string;
    decoration?: string;
    opacity?: number;
    family?: string;
  } = {},
) {
  const a: string[] = [];
  a.push(`x="${x}"`);
  a.push(`y="${y}"`);
  a.push(`text-anchor="${o.anchor || 'start'}"`);
  a.push(`font-family="${fam(o.family || FONTS.plusJakarta)}, sans-serif"`);
  a.push(`font-size="${o.size ?? 14}"`);
  a.push(`font-weight="${o.weight ?? 400}"`);
  a.push(`fill="${o.fill || '#111827'}"`);
  if (o.spacing != null) a.push(`letter-spacing="${o.spacing}"`);
  if (o.style) a.push(`font-style="${o.style}"`);
  if (o.decoration) a.push(`text-decoration="${o.decoration}"`);
  if (o.opacity != null) a.push(`opacity="${o.opacity}"`);
  const tr = o.transform ? ` transform="${o.transform}"` : '';
  return `<text ${a.join(' ')}${tr}>${esc(content)}</text>`;
}

function getInitialsLocal(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  if (parts.length === 2) return (parts[0][0] + parts[1].slice(0, 2)).toUpperCase();
  return (parts[0][0] + parts[1][0] + parts[2][0]).toUpperCase();
}

function photoEl(
  box: { x: number; y: number; w: number; h: number },
  dataUrl: string | null | undefined,
  clipId: string,
  placeholder: { cx: number; cy: number; text: string; size?: number },
) {
  if (!dataUrl) {
    const fontSize = placeholder.size ?? 36;
    return (
      `<g>` +
      `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="url(#imgFallbackGrad)"/>` +
      txt(placeholder.cx, placeholder.cy + fontSize / 4, placeholder.text, {
        size: fontSize,
        weight: 900,
        fill: '#ffffff',
        anchor: 'middle',
      }) +
      `</g>`
    );
  }
  return (
    `<g clip-path="url(#${clipId})">` +
    `<image x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" preserveAspectRatio="xMidYMid slice" href="${dataUrl}" xlink:href="${dataUrl}"/>` +
    `</g>`
  );
}

function patternGroup(name: string, side: 'front' | 'back') {
  const cfg = side === 'back' ? PATTERN.back : PATTERN.front;
  const rows = patternRows(name, side);
  return rows
    .map((row: string[], i: number) => {
      const top = cfg.top + i * cfg.stepY;
      const colW = name.length * cfg.fontSize * 0.62 + cfg.gapX;
      // Repeat nama sepanjang kartu (lebar est. nama × cols), berlebih ke kiri/kanan
      const texts = row
        .map((w: string, j: number) => {
          const x = -80 + j * colW;
          return `<text x="${x.toFixed(1)}" y="${top + cfg.fontSize * 0.78}" font-family="${fam(FONTS.robotoBold)}, sans-serif" font-size="${cfg.fontSize}" font-weight="900" letter-spacing="${cfg.letterSpacing}" fill="${cfg.color}">${esc(w)}</text>`;
        })
        .join('');
      return `<g transform="rotate(${cfg.angle} ${CARD.W / 2} ${top + cfg.fontSize * 0.4})" opacity="${cfg.opacity}">${texts}</g>`;
    })
    .join('');
}

/** Sisi depan kartu (koordinat 0..856 × 0..540). */
function frontSide(d: CardSvgData): string {
  const { member } = d;
  const distrik = (member.distrik || 'THS-THM').replace(/^keuskupan\s*/i, '').toUpperCase();
  const ttl = fmt.ttl(member.tempatLahir, member.tanggalLahir);
  const validUntilStr = fmt.validUntilText();
  const lv = getLevelVisual(member.tingkat, d.levelVisual || null);
  const cfg = d.template?.overlayConfig || null;
  const guillocheOff = cfg?.guilloche?.enabledFront === false;
  const guillocheStroke = cfg?.guilloche?.strokeFront || null;

  let s = '';
  // Latar: gambar upload template ATAU dekorasi bawaan (gradien/ombak/header/bottom)
  if (d.frontImageDataUrl) {
    s += `<image x="0" y="0" width="856" height="540" preserveAspectRatio="xMidYMid slice" href="${d.frontImageDataUrl}" xlink:href="${d.frontImageDataUrl}"/>`;
  } else {
    s += `<rect width="856" height="540" fill="${COLORS.front.bg}"/>`;
    s += `<g>${svgInner(decorFrontSvg())}</g>`;
    // Lingkaran dekorasi
    s += `<circle cx="776" cy="80" r="160" fill="${COLORS.bgCircle1}"/>`;
    s += `<circle cx="80" cy="270" r="190" fill="${COLORS.bgCircle2}"/>`;
  }
  if (!guillocheOff) s += `<g>${svgInner(guillocheSvg('front', guillocheStroke || undefined))}</g>`;

  // Pattern nama miring (anti-fotokopi)
  s += patternGroup(member.namaLengkap || 'THS-THM', 'front');

  // Header — logo + 4 baris (kontras putih di atas pita biru)
  const logoX = FRONT.header.padH;
  const logoY = FRONT.header.padTop;
  s += `<g>`;
  s += `<clipPath id="clipLogo"><circle cx="${logoX + FRONT.logo.size / 2}" cy="${logoY + FRONT.logo.size / 2}" r="${FRONT.logo.size / 2}"/></clipPath>`;
  // Tanpa lingkaran latar putih (FRONT.logo.bg = transparent, border = 0).
  s += `<g clip-path="url(#clipLogo)"><image x="${logoX + (FRONT.logo.size - FRONT.logo.img) / 2}" y="${logoY + (FRONT.logo.size - FRONT.logo.img) / 2}" width="${FRONT.logo.img}" height="${FRONT.logo.img}" preserveAspectRatio="xMidYMid meet" href="${KTA_LOGO_DATA_URL}" xlink:href="${KTA_LOGO_DATA_URL}"/></g>`;
  const textX = logoX + FRONT.logo.size + FRONT.header.gap;
  const rows: Array<[string, number]> = [
    ['KARTU TANDA ANGGOTA', FRONT.header.row.spacing[0]],
    ['ORGANISASI PENCAK SILAT PENDIDIKAN', FRONT.header.row.spacing[1]],
    ['TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA', FRONT.header.row.spacing[2]],
    [`DISTRIK KEUSKUPAN ${distrik}`, 0],
  ];
  let rowY = logoY + FRONT.header.row.fontSize;
  rows.forEach(([t, sp]) => {
    s += txt(textX, rowY, t, {
      size: FRONT.header.row.fontSize,
      weight: 900,
      fill: COLORS.headerText,
      spacing: sp,
      family: FONTS.openSansBold,
    });
    rowY += FRONT.header.row.lineHeight + FRONT.header.row.rowGap;
  });
  s += `</g>`;

  // Foto besar kiri + foto kecil kanan atas (memenuhi bingkai, object-fit cover)
  const big = {
    x: FRONT.photo.big.left,
    y: FRONT.photo.big.top,
    w: FRONT.photo.big.w,
    h: FRONT.photo.big.h,
  };
  const small = {
    x: CARD.W - FRONT.photo.small.right - FRONT.photo.small.w,
    y: FRONT.photo.small.top,
    w: FRONT.photo.small.w,
    h: FRONT.photo.small.h,
  };
  s += `<clipPath id="clipBig"><rect x="${big.x}" y="${big.y}" width="${big.w}" height="${big.h}"/></clipPath>`;
  s += `<clipPath id="clipSmall"><rect x="${small.x}" y="${small.y}" width="${small.w}" height="${small.h}"/></clipPath>`;
  s += photoEl(big, d.photoDataUrl, 'clipBig', {
    cx: big.x + big.w / 2,
    cy: big.y + big.h / 2,
    text: getInitialsLocal(member.namaLengkap),
    size: 52,
  });
  s += photoEl(small, d.photoDataUrl, 'clipSmall', {
    cx: small.x + small.w / 2,
    cy: small.y + small.h / 2,
    text: getInitialsLocal(member.namaLengkap),
    size: 36,
  });

  // Level rank — di bawah foto kecil
  if (lv.stripCount > 0) {
    const rankX = CARD.W - FRONT.rank.right - FRONT.rank.w;
    s += `<g>`;
    s += txt(
      rankX + FRONT.rank.w / 2,
      FRONT.rank.top + FRONT.rank.name.fontSize,
      (member.tingkat || lv.label || '').toUpperCase(),
      {
        size: FRONT.rank.name.fontSize,
        weight: 900,
        fill: COLORS.rankText,
        anchor: 'middle',
        spacing: FRONT.rank.name.letterSpacing,
      },
    );
    const stripY0 = FRONT.rank.top + FRONT.rank.name.fontSize + 4 + FRONT.rank.name.marginBottom;
    for (let i = 0; i < lv.stripCount; i++) {
      const y = stripY0 + i * (FRONT.rank.strip.h + FRONT.rank.strip.gap);
      s += `<rect x="${rankX}" y="${y}" width="${FRONT.rank.w}" height="${FRONT.rank.strip.h}" rx="${FRONT.rank.strip.radius}" fill="${lv.color}" stroke="${COLORS.rankStripBorder}" stroke-width="1"/>`;
    }
    s += `</g>`;
  }

  // Info — label + nilai (uppercase)
  const infoX = FRONT.info.left;
  const infoTop = FRONT.info.top;
  const infoRows: Array<{ label: string; value: string; strong?: boolean }> = [
    { label: 'No. Anggota', value: (member.nomorAnggota || '-').toUpperCase(), strong: true },
    { label: 'Nama', value: (member.namaLengkap || '-').toUpperCase() },
    { label: 'Tempat, Tanggal Lahir', value: ttl.toUpperCase() },
    { label: 'Ranting', value: (member.ranting || '-').toUpperCase() },
    { label: 'Wilayah', value: (member.wilayah || '-').toUpperCase() },
    { label: 'Pekerjaan', value: truncate((member.pekerjaan || '-').toUpperCase(), 42) },
  ];
  s += `<g>`;
  let infoY = infoTop;
  let namaLabelBaseline = -1; // -1 = baris Nama belum dirender
  infoRows.forEach((r) => {
    const labelBaseline = infoY + FRONT.info.label.fontSize;
    if (r.label === 'Nama') namaLabelBaseline = labelBaseline;
    s += txt(infoX, labelBaseline, r.label, {
      size: FRONT.info.label.fontSize,
      weight: 700,
      fill: FRONT.info.label.color,
      spacing: FRONT.info.label.letterSpacing,
    });
    if (r.strong) {
      s += txt(
        infoX,
        labelBaseline + FRONT.info.valueStrong.marginTop + FRONT.info.valueStrong.fontSize,
        r.value,
        {
          size: FRONT.info.valueStrong.fontSize,
          weight: 900,
          fill: FRONT.info.valueStrong.color,
          spacing: FRONT.info.valueStrong.letterSpacing,
          family: FONTS.ocrA,
        },
      );
    } else {
      s += txt(
        infoX,
        labelBaseline + FRONT.info.value.marginTop + FRONT.info.value.fontSize,
        r.value,
        {
          size: FRONT.info.value.fontSize,
          weight: 700,
          fill: FRONT.info.value.color,
          family: FONTS.ocrA,
        },
      );
    }
    infoY =
      labelBaseline +
      FRONT.info.value.fontSize +
      FRONT.info.value.marginTop +
      FRONT.info.rowMarginBottom +
      FRONT.info.label.fontSize * 0.2;
  });
  // JK kolom sejajar label Nama — geometri sama dgn flex web/PDF/mobile (spec .info-pair):
  // kolom kiri = infoW - jk.w - jk.marginLeft = 346, lalu jkBox mulai setelah margin 40
  // → teks JK di x = infoX + (infoW - jk.w) = 250 + 430 - 44 = 636.
  const infoW = CARD.W - FRONT.info.left - FRONT.info.right;
  const jkX = infoX + infoW - FRONT.info.jk.w;
  if (namaLabelBaseline >= 0) {
    s += txt(jkX, namaLabelBaseline, 'JK', {
      size: FRONT.info.label.fontSize,
      weight: 700,
      fill: FRONT.info.label.color,
      spacing: FRONT.info.label.letterSpacing,
    });
    s += txt(
      jkX,
      namaLabelBaseline + FRONT.info.value.marginTop + FRONT.info.value.fontSize,
      member.jenisKelamin === 'P' ? 'P' : 'L',
      {
        size: FRONT.info.value.fontSize,
        weight: 900,
        fill: FRONT.info.value.color,
        family: FONTS.ocrA,
      },
    );
  }
  s += `</g>`;

  // Bottom — masa berlaku
  s += `<g>`;
  const botX = FRONT.bottom.left;
  const botY = CARD.H - FRONT.bottom.bottom;
  s += txt(botX, botY - FRONT.bottom.value.fontSize - 2, 'Berlaku sampai', {
    size: FRONT.bottom.label.fontSize,
    weight: 700,
    fill: FRONT.bottom.label.color,
  });
  s += txt(botX, botY, validUntilStr, {
    size: FRONT.bottom.value.fontSize,
    weight: 700,
    fill: FRONT.bottom.value.color,
  });
  s += `</g>`;

  return s;
}

/** Sisi belakang kartu (koordinat lokal 0..856 × 0..540). */
function backSide(d: CardSvgData): string {
  const { member } = d;
  const ttl = fmt.ttl(member.tempatLahir, member.tanggalLahir);
  const dadar = fmt.dadar(member.tempatDadar, member.tahunDadar);
  const pelantikan = fmt.proper(member.pelantikan || dadar);
  const validUntilStr = fmt.validUntilText();
  const cfg = d.template?.overlayConfig || null;
  const guillocheOff = cfg?.guilloche?.enabledBack === false;
  const guillocheStroke = cfg?.guilloche?.strokeBack || null;
  const bh = BACK.header;
  const info = BACK.info;

  let s = '';
  if (d.backImageDataUrl) {
    s += `<image x="0" y="0" width="856" height="540" preserveAspectRatio="xMidYMid slice" href="${d.backImageDataUrl}" xlink:href="${d.backImageDataUrl}"/>`;
  } else {
    s += `<rect width="856" height="540" fill="${COLORS.back.bg}"/>`;
    s += `<g>${svgInner(decorBackSvg())}</g>`;
  }
  if (!guillocheOff) s += `<g>${svgInner(guillocheSvg('back', guillocheStroke || undefined))}</g>`;

  s += patternGroup(member.namaLengkap || 'THS-THM', 'back');

  // Header band — gradien biru (+ hairline)
  s += `<rect x="0" y="0" width="856" height="${bh.height}" fill="url(#backHeadGrad)"/>`;
  const logoH = bh.logo;
  s += `<g>`;
  s += `<clipPath id="clipBackLogo"><circle cx="${bh.padH + logoH.size / 2}" cy="${bh.height / 2}" r="${logoH.size / 2}"/></clipPath>`;
  // Tanpa lingkaran latar putih (BACK.header.logo.bg = transparent, border = 0).
  s += `<g clip-path="url(#clipBackLogo)"><image x="${bh.padH + (logoH.size - logoH.img) / 2}" y="${bh.height / 2 - logoH.img / 2}" width="${logoH.img}" height="${logoH.img}" preserveAspectRatio="xMidYMid meet" href="${KTA_LOGO_DATA_URL}" xlink:href="${KTA_LOGO_DATA_URL}"/></g>`;
  s += txt(bh.padH + logoH.size + bh.gap, bh.height / 2 - 2, 'VERIFIKASI KARTU ANGGOTA', {
    size: bh.title.fontSize,
    weight: 900,
    fill: COLORS.white,
    spacing: bh.title.letterSpacing,
  });
  s += txt(
    bh.padH + logoH.size + bh.gap,
    bh.height / 2 + bh.title.fontSize + bh.subtitle.marginTop,
    'Scan QR untuk memeriksa keabsahan anggota',
    {
      size: bh.subtitle.fontSize,
      fill: COLORS.white,
      opacity: bh.subtitle.opacity,
      family: FONTS.robotoRegular,
    },
  );
  s += `</g>`;
  s += `<rect x="0" y="${bh.height - bh.hairline.height}" width="856" height="${bh.hairline.height}" fill="${bh.hairline.color}"/>`;

  // QR
  const qr = BACK.qr;
  s += `<rect x="${qr.left}" y="${qr.top}" width="${qr.size}" height="${qr.size}" rx="${qr.radius}" fill="${qr.bg}" stroke="${qr.borderColor}" stroke-width="${qr.border}"/>`;
  const qrInner = qr.size - qr.padding * 2;
  const qrX = qr.left + qr.padding;
  const qrY = qr.top + qr.padding;
  s += `<clipPath id="clipQr"><rect x="${qrX}" y="${qrY}" width="${qrInner}" height="${qrInner}" rx="${qr.radius - qr.padding}"/></clipPath>`;
  if (d.qrDataUrl) {
    s += `<g clip-path="url(#clipQr)"><image x="${qrX}" y="${qrY}" width="${qrInner}" height="${qrInner}" preserveAspectRatio="xMidYMid meet" href="${d.qrDataUrl}" xlink:href="${d.qrDataUrl}"/></g>`;
  } else {
    s += txt(qrX + qrInner / 2, qrY + qrInner / 2 + 10, 'QR', {
      size: 30,
      weight: 700,
      fill: '#475569',
      anchor: 'middle',
    });
  }

  // Info belakang — teks putih di atas gradien (no box), Proper Case
  const infoX = info.left + info.padding;
  let y = info.top + info.padding + info.desc.fontSize;
  s += txt(
    infoX,
    y,
    'Halaman verifikasi publik hanya menampilkan data minimum untuk membuktikan keabsahan anggota.',
    {
      size: info.desc.fontSize,
      fill: COLORS.white,
      opacity: info.desc.opacity,
      family: FONTS.robotoRegular,
    },
  );
  y += info.desc.lineHeight + info.desc.marginBottom + info.row.label.fontSize;
  const rowsBack: Array<[string, string]> = [
    ['TTL', truncate(fmt.proper(ttl), 34)],
    ['DADAR', truncate(fmt.proper(dadar), 34)],
    ['Pelantikan', truncate(pelantikan, 34)],
    ['Pekerjaan', truncate(fmt.proper(member.pekerjaan || '-'), 34)],
    [
      'Status',
      fmt.proper(member.statusKeanggotaan === 'aktif' ? 'Aktif' : 'Nonaktif'),
    ],
    ['Valid s/d', fmt.proper(validUntilStr)],
    [
      'Alamat',
      truncate(`THS-THM, ${fmt.proper(member.alamatDistrik || 'Distrik')}`, 34),
    ],
  ];
  rowsBack.forEach(([label, value]) => {
    s += `<g>`;
    s += txt(infoX, y, label, { size: info.row.label.fontSize, weight: 700, fill: COLORS.white });
    s += txt(infoX + info.row.label.w + 2, y, ':', {
      size: info.row.label.fontSize,
      weight: 700,
      fill: COLORS.white,
      opacity: 0.9,
    });
    s += txt(infoX + info.row.label.w + info.row.colon.w, y, value, {
      size: info.row.value.fontSize,
      weight: 400,
      fill: COLORS.white,
      family: FONTS.robotoRegular,
    });
    s += `</g>`;
    y += info.row.label.fontSize + info.row.marginBottom + 4;
  });

  // Footer
  const ft = BACK.footer;
  s += txt(
    ft.left,
    CARD.H - ft.bottom - 8,
    'Jika kartu ini ditemukan, harap menghubungi sekretariat THS-THM setempat.',
    {
      size: ft.text.fontSize,
      fill: '#f0f9ff',
      opacity: ft.text.opacity,
      family: FONTS.robotoRegular,
    },
  );
  s += txt(
    CARD.W - ft.right,
    CARD.H - ft.bottom - ft.urlValue.fontSize - ft.urlValue.marginTop - ft.urlLabel.fontSize - 4,
    'URL VERIFIKASI',
    {
      size: ft.urlLabel.fontSize,
      fill: '#f0f9ff',
      opacity: ft.urlLabel.opacity,
      anchor: 'end',
      family: FONTS.robotoRegular,
    },
  );
  s += txt(CARD.W - ft.right, CARD.H - ft.bottom, d.verificationUrl, {
    size: ft.urlValue.fontSize,
    weight: 700,
    fill: COLORS.white,
    anchor: 'end',
  });

  // Penandatangan + stempel — kanan-bawah sisi belakang (BACK.signer).
  const sg = BACK.signer;
  const signerLeft = CARD.W - sg.right - sg.w;
  const signerTop = CARD.H - sg.bottom - sg.h;
  const primary = d.signers?.[0] || {
    signerName: d.signerName,
    signerTitle: d.signerTitle,
  };
  const signerTitle = primary?.signerTitle || d.signerTitle || 'KOORDINATOR DISTRIK';
  const signerName = primary?.signerName || d.signerName || 'Koordinator Distrik';
  const titleX = CARD.W - sg.right - sg.title.right;
  const titleY = signerTop + sg.title.top + sg.title.fontSize;
  const nameX = CARD.W - sg.right - sg.name.right;
  const nameY = CARD.H - sg.bottom - sg.name.bottom;
  const sigX = signerLeft + sg.w - sg.sig.right - sg.sig.w;
  const sigY = signerTop + sg.h - sg.sig.bottom - sg.sig.h;
  const stampX = signerLeft + sg.w - sg.stamp.right - sg.stamp.size;
  const stampY = signerTop + sg.h - sg.stamp.bottom - sg.stamp.size;

  s += txt(titleX, titleY, signerTitle.toUpperCase(), {
    size: sg.title.fontSize,
    weight: 700,
    fill: COLORS.value,
    anchor: 'end',
  });
  s += txt(nameX, nameY, signerName.toUpperCase(), {
    size: sg.name.fontSize,
    weight: 900,
    fill: COLORS.value,
    anchor: 'end',
    decoration: sg.name.underline ? 'underline' : undefined,
  });
  if (d.signatureDataUrl) {
    s += `<g transform="rotate(${sg.sig.rotate} ${sigX + sg.sig.w / 2} ${sigY + sg.sig.h / 2})" opacity="0.7">`;
    s += `<image x="${sigX}" y="${sigY}" width="${sg.sig.w}" height="${sg.sig.h}" preserveAspectRatio="xMidYMid meet" href="${d.signatureDataUrl}" xlink:href="${d.signatureDataUrl}"/>`;
    s += `</g>`;
  }
  if (d.stampDataUrl) {
    const cx = stampX + sg.stamp.size / 2;
    const cy = stampY + sg.stamp.size / 2;
    s += `<g transform="rotate(${sg.stamp.rotate} ${cx} ${cy})">`;
    s += `<clipPath id="clipBackStamp"><circle cx="${cx}" cy="${cy}" r="${sg.stamp.size / 2}"/></clipPath>`;
    s += `<g clip-path="url(#clipBackStamp)"><image x="${stampX}" y="${stampY}" width="${sg.stamp.size}" height="${sg.stamp.size}" preserveAspectRatio="xMidYMid slice" href="${d.stampDataUrl}" xlink:href="${d.stampDataUrl}"/></g>`;
    s += `</g>`;
  }

  return s;
}

/**
 * Bangun dokumen SVG 856×1080 (depan atas, belakang bawah) untuk di-render PNG.
 */
export function buildCardSvg(d: CardSvgData): string {
  return (
    `<svg width="${CARD.W}" height="${CARD.H * 2}" viewBox="0 0 ${CARD.W} ${CARD.H * 2}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
    `<defs>` +
    `<style>${PLUS_JAKARTA_FONT_CSS}</style>` +
    `<linearGradient id="backHeadGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${COLORS.header.from}"/><stop offset="100%" stop-color="${COLORS.header.to}"/></linearGradient>` +
    `<linearGradient id="imgFallbackGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#3D5BE0"/><stop offset="100%" stop-color="#051C8A"/></linearGradient>` +
    `</defs>` +
    `<g id="face-front">${frontSide(d)}</g>` +
    `<g id="face-back" transform="translate(0 ${CARD.H})">${backSide(d)}</g>` +
    `</svg>`
  );
}
