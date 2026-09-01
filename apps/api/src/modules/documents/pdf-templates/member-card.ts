/* eslint-disable @typescript-eslint/no-require-imports */
const React = require('react');
const { Document, Page, View, Text, Image, StyleSheet, Svg, Defs, LinearGradient, Stop, Rect } = require('@react-pdf/renderer');
const { KTA_LOGO_DATA_URL } = require('./kta-logo');
const { MAP_INDONESIA_DATA_URL, MAP_INDONESIA_LIGHT_DATA_URL } = require('./map-indonesia');

// ── Sumber tunggal desain kartu — packages/card-design (mobile/web/PDF/preview) ──
const { CARD, COLORS, FRONT, BACK, getLevelVisual, photoCrop } = require('../../../common/utils/card-design');

// Palette PDF: warna kanon dari spec; nilai yang tak ada di spec tetap lokal (gaya print khas PDF)
const BLUE_900 = COLORS.label; // #1e3a5f — garis & judul kartu
const BLUE_800 = '#1e4a7a';
const WHITE = COLORS.white;
const SLATE_800 = COLORS.value; // #111827 — teks data

// Crop foto wajah ala SIM (kepala + bahu) — kalkulasi sama di semua renderer
const cropBig = photoCrop(FRONT.photo.big.w, FRONT.photo.big.h);
const cropSmall = photoCrop(FRONT.photo.small.w, FRONT.photo.small.h);

const styles = StyleSheet.create({
  // ── Front Side ──
  pageFront: {
    width: CARD.W,
    height: CARD.H,
    padding: 0,
    backgroundColor: WHITE,
    position: 'relative',
  },
  bgCircle1: {
    position: 'absolute',
    top: FRONT.bgCircle1.top,
    right: FRONT.bgCircle1.right,
    width: FRONT.bgCircle1.size,
    height: FRONT.bgCircle1.size,
    borderRadius: FRONT.bgCircle1.size / 2,
    backgroundColor: COLORS.bgCircle1,
  },
  bgCircle2: {
    position: 'absolute',
    bottom: FRONT.bgCircle2.bottom,
    left: FRONT.bgCircle2.left,
    width: FRONT.bgCircle2.size,
    height: FRONT.bgCircle2.size,
    borderRadius: FRONT.bgCircle2.size / 2,
    backgroundColor: COLORS.bgCircle2,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: BLUE_900,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: BLUE_800,
  },
  // Watermark peta — posisi dari spec
  watermark: {
    position: 'absolute',
    left: FRONT.watermark.left,
    top: FRONT.watermark.top,
    width: FRONT.watermark.w,
    height: FRONT.watermark.h,
  },
  watermarkLogo: {
    width: '100%',
    height: '100%',
    opacity: 0.07,
  },
  headerRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  // Logo 1.25× (115px dari 92px) agar sebagian melewati warna biru header (topBar 64px)
  logo: {
    width: 115,
    height: 115,
    borderRadius: 57,
    position: 'relative',
    overflow: 'hidden',
  },
  logoImg: {
    width: 115,
    height: 115,
    borderRadius: 57,
  },
  row1: {
    color: WHITE,
    fontSize: 15,
    fontWeight: 'heavy',
    letterSpacing: 2.1,
  },
  row2: {
    color: WHITE,
    fontSize: 11,
    fontWeight: 'semibold',
    opacity: 0.95,
    letterSpacing: 1.2,
    marginTop: 1,
  },
  orgName: {
    color: WHITE,
    fontSize: 16,
    fontWeight: 'heavy',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  distrikName: {
    color: WHITE,
    fontSize: 12.5,
    fontWeight: 'semibold',
    opacity: 0.95,
    marginTop: 2,
  },
  // Photo besar kiri — TANPA bingkai
  photoBox: {
    position: 'absolute',
    left: FRONT.photo.big.left,
    top: FRONT.photo.big.top,
    width: FRONT.photo.big.w,
    height: FRONT.photo.big.h,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Foto ala SIM: crop kepala+bahu dari spec (photoCrop)
  photoImage: {
    position: 'absolute',
    left: cropBig.left,
    top: 0,
    width: cropBig.w,
    height: cropBig.h,
    objectFit: 'cover',
  },
  // Photo kecil kanan atas — TANPA bingkai, dinaikkan; rank 12px di bawahnya
  photoBoxSmall: {
    position: 'absolute',
    right: FRONT.photo.small.right,
    top: FRONT.photo.small.top,
    width: FRONT.photo.small.w,
    height: FRONT.photo.small.h,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImageSmall: {
    position: 'absolute',
    left: cropSmall.left,
    top: 0,
    width: cropSmall.w,
    height: cropSmall.h,
    objectFit: 'cover',
  },
  photoPlaceholder: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Level rank — DI BAWAH photo kecil kanan atas (jarak kecil); teks nama tingkat selebar strip; sembunyi utk 'Anggota'
  rankBox: {
    position: 'absolute',
    right: FRONT.rank.right,
    top: FRONT.rank.top,
    width: FRONT.rank.w,
  },
  rankName: {
    color: COLORS.rankText,
    fontSize: FRONT.rank.name.fontSize,
    fontWeight: 'heavy',
    textAlign: 'center',
    letterSpacing: FRONT.rank.name.letterSpacing,
    marginBottom: FRONT.rank.name.marginBottom,
  },
  levelStrips: {
    width: '100%',
  },
  levelStrip: {
    height: FRONT.rank.strip.h,
    marginBottom: FRONT.rank.strip.gap,
    borderRadius: FRONT.rank.strip.radius,
    borderWidth: 1,
    borderColor: COLORS.rankStripBorder,
  },
  // Info — label di atas, nilai di bawah; kolom tengah (foto kiri + kanan)
  infoSection: {
    position: 'absolute',
    left: FRONT.info.left,
    top: FRONT.info.top,
    right: FRONT.info.right,
    zIndex: 20,
  },
  infoRow: {
    marginBottom: FRONT.info.rowMarginBottom,
  },
  infoLabel: {
    fontSize: FRONT.info.label.fontSize,
    fontWeight: 'bold',
    color: FRONT.info.label.color,
    textTransform: 'uppercase',
    letterSpacing: FRONT.info.label.letterSpacing,
    // Jenis huruf label berbeda dari data (serif Times vs data Helvetica)
    fontFamily: 'Times-Bold',
  },
  infoValue: {
    fontSize: FRONT.info.value.fontSize,
    fontWeight: 'bold',
    color: SLATE_800,
    marginTop: FRONT.info.value.marginTop,
    lineHeight: FRONT.info.value.lineHeight,
  },
  // Nama + JK — label JK sejajar label Nama (jarak 1-2 tab), data L/P sejajar data Nama
  infoPair: {
    flexDirection: 'row',
    marginBottom: 13,
  },
  infoPairLeft: {
    flexShrink: 1,
  },
  jkBox: {
    width: FRONT.info.jk.w,
    marginLeft: FRONT.info.jk.marginLeft,
  },
  jkLabel: {
    fontSize: FRONT.info.label.fontSize,
    fontWeight: 'bold',
    color: FRONT.info.label.color,
    textTransform: 'uppercase',
    letterSpacing: FRONT.info.label.letterSpacing,
  },
  jkValue: {
    fontSize: FRONT.info.value.fontSize,
    fontWeight: 'heavy',
    color: SLATE_800,
    marginTop: FRONT.info.value.marginTop,
  },
  infoValueStrong: {
    fontSize: FRONT.info.valueStrong.fontSize,
    fontWeight: 'heavy',
    color: FRONT.info.valueStrong.color,
    marginTop: FRONT.info.valueStrong.marginTop,
  },
  bottomInfo: {
    position: 'absolute',
    left: FRONT.bottom.left,
    bottom: FRONT.bottom.bottom,
  },
  validUntil: {
    color: WHITE,
    fontSize: 15,
    opacity: 0.9,
    fontFamily: 'Times-Bold',
  },
  validUntilValue: {
    color: WHITE,
    fontSize: 22,
    fontWeight: 'heavy',
    marginTop: 2,
  },
  // Stempel 110 px (50% dari 220 px ≈ 1,1 cm pada skala CR80 856 px = 8.56 cm), cap di-upload di dalamnya
  // Blok penandatangan digeser ke kanan (right 24) & teks koordinator turun sejajar di bawah data Wilayah;
  // teks KOORDINATOR/KEUSKUPAN (gelap, di atas area putih) → stempel (tdk ditebalkan) + ttd → nama (underline) + jabatan (putih, di atas pita biru bawah)
  // Grup pengesahan dinaikkan (bottom 14 → bawah teks sejajar tanggal masa laku) & digeser kanan (right -8)
  signature: {
    position: 'absolute',
    right: FRONT.signer.right,
    bottom: FRONT.signer.bottom,
    width: FRONT.signer.w,
    height: FRONT.signer.h,
    alignItems: 'flex-start',
  },
  // Teks KOORDINATORAT diturunkan: tepi atas (top 35) tepat berhimpit dengan tepi atas stempel
  sigTitle1: {
    position: 'absolute',
    left: FRONT.signer.title1.left,
    top: FRONT.signer.title1.top,
    color: COLORS.value,
    fontSize: FRONT.signer.title1.fontSize,
    fontWeight: 'heavy',
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  sigTitle2: {
    position: 'absolute',
    left: FRONT.signer.title2.left,
    top: FRONT.signer.title2.top,
    color: COLORS.value,
    fontSize: FRONT.signer.title2.fontSize,
    fontWeight: 'heavy',
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  sigWrap: {
    position: 'absolute',
    left: FRONT.signer.wrap.left,
    top: FRONT.signer.wrap.top,
    width: FRONT.signer.wrap.w,
    height: FRONT.signer.wrap.h,
  },
  // ttd digeser kanan-bawah — posisi/ukuran dari spec
  sigText: {
    position: 'absolute',
    left: FRONT.signer.sig.left,
    top: FRONT.signer.sig.top,
    fontSize: FRONT.signer.sig.fontSize,
    fontStyle: 'italic',
    transform: `rotate(${FRONT.signer.sig.rotate}deg)`,
    color: FRONT.signer.sig.color,
  },
  sigImage: {
    position: 'absolute',
    left: FRONT.signer.sig.left,
    top: FRONT.signer.sig.top,
    width: FRONT.signer.sig.w,
    height: FRONT.signer.sig.h,
    opacity: 0.75,
    transform: `rotate(${FRONT.signer.sig.rotate}deg)`,
  },
  // Salinan kedua di posisi sama — ttd ditebalkan (bukan berbayang)
  sigImage2: {
    position: 'absolute',
    left: FRONT.signer.sig.left,
    top: FRONT.signer.sig.top,
    width: FRONT.signer.sig.w,
    height: FRONT.signer.sig.h,
    opacity: 0.75,
    transform: `rotate(${FRONT.signer.sig.rotate}deg)`,
  },
  stamp: {
    position: 'absolute',
    left: FRONT.signer.stamp.left,
    top: FRONT.signer.stamp.top,
    width: FRONT.signer.stamp.size,
    height: FRONT.signer.stamp.size,
    borderRadius: FRONT.signer.stamp.radius,
    borderWidth: FRONT.signer.stamp.border,
    borderColor: COLORS.stampBorder,
    alignItems: 'center',
    justifyContent: 'center',
    transform: `rotate(${FRONT.signer.stamp.rotate}deg)`,
    overflow: 'hidden',
  },
  stampImg: {
    width: '100%',
    height: '100%',
  },
  stampText: {
    fontSize: FRONT.signer.stamp.text.fontSize,
    fontWeight: 'bold',
    color: COLORS.stampText,
    transform: 'rotate(-12deg)',
  },
  signerName: {
    color: WHITE,
    fontSize: 14,
    fontWeight: 'heavy',
    textAlign: 'left',
    textTransform: 'uppercase',
    textDecoration: 'underline',
  },
  signerTitle: {
    color: WHITE,
    fontSize: 12,
    fontWeight: 'semibold',
    opacity: 0.95,
    marginTop: 1,
    textTransform: 'uppercase',
  },

  // ── Back Side ──
  pageBack: {
    width: CARD.W,
    height: CARD.H,
    padding: 0,
    backgroundColor: BLUE_900,
    position: 'relative',
  },
  backWatermarkLogo: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backWatermarkImg: {
    width: BACK.watermark.w,
    height: BACK.watermark.h,
    opacity: 0.14,
  },
  backTitle: {
    position: 'absolute',
    top: BACK.title.top,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: WHITE,
    fontSize: BACK.title.fontSize,
    fontWeight: 'heavy',
    letterSpacing: BACK.title.letterSpacing,
  },
  backSubtitle: {
    position: 'absolute',
    top: 66,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: WHITE,
    fontSize: BACK.title.subtitle.fontSize,
    opacity: 0.9,
  },
  qrSection: {
    position: 'absolute',
    left: BACK.qr.left,
    top: BACK.qr.top,
    width: BACK.qr.size,
    height: BACK.qr.size,
    backgroundColor: BACK.qr.bg,
    borderRadius: BACK.qr.radius,
    borderWidth: BACK.qr.border,
    borderColor: BACK.qr.borderColor,
    padding: BACK.qr.padding,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: 170,
    height: 170,
  },
  backInfo: {
    position: 'absolute',
    left: BACK.info.left,
    top: BACK.info.top,
    right: BACK.info.right,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,219,254,0.5)',
    padding: BACK.info.padding,
  },
  backDesc: {
    fontSize: BACK.info.desc.fontSize,
    lineHeight: 1.5,
    color: '#334155',
    marginBottom: BACK.info.desc.marginBottom,
  },
  backRow: {
    flexDirection: 'row',
    marginBottom: BACK.info.row.marginBottom,
    alignItems: 'flex-start',
  },
  backLabel: {
    width: BACK.info.row.label.w,
    fontSize: BACK.info.row.label.fontSize,
    fontWeight: 'heavy',
    color: '#1e3a5f',
  },
  backValue: {
    flex: 1,
    fontSize: BACK.info.row.value.fontSize,
    fontWeight: 'semibold',
    color: SLATE_800,
  },
  backFooter: {
    position: 'absolute',
    left: BACK.footer.left,
    right: BACK.footer.right,
    bottom: BACK.footer.bottom,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerText: {
    color: WHITE,
    fontSize: BACK.footer.text.fontSize,
    opacity: BACK.footer.text.opacity,
    maxWidth: 610,
    lineHeight: 1.4,
  },
  footerUrlBox: {
    alignItems: 'flex-end',
  },
  footerUrlLabel: {
    color: WHITE,
    fontSize: BACK.footer.urlLabel.fontSize,
    opacity: BACK.footer.urlLabel.opacity,
  },
  footerUrl: {
    color: WHITE,
    fontSize: BACK.footer.urlValue.fontSize,
    fontWeight: 'bold',
    marginTop: BACK.footer.urlValue.marginTop,
  },
  // Latar desain upload (template kartu aktif) — full-bleed di atas kanvas 856×540
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});

/** Konfigurasi template kartu aktif yang mempengaruhi rendering PDF. */
interface CardTemplatePdfConfig {
  frontImage?: string | null;
  backImage?: string | null;
  guilloche?: { enabledFront?: boolean; enabledBack?: boolean; strokeFront?: string; strokeBack?: string };
  watermark?: { enabledFront?: boolean; enabledBack?: boolean };
}

interface MemberCardPdfProps {
  member: {
    namaLengkap: string;
    nomorAnggota: string;
    tempatLahir?: string | null;
    tanggalLahir?: string | null;
    jenisKelamin: string;
    tingkat?: string | null;
    tempatDadar?: string | null;
    tahunDadar?: string | null;
    ranting?: string;
    wilayah?: string;
    distrik?: string;
    alamatDistrik?: string | null;
    statusKeanggotaan: string;
  };
  cardConfig: {
    nomorDokumen: string;
    qrDataUrl: string;
    verificationUrl: string;
    /** Penandatangan kartu (1-3 orang). Jika kosong, pakai signerName/signerTitle lama. */
    signers?: Array<{ signerName?: string; signerTitle?: string }>;
    signerName?: string;
    signerTitle?: string;
    /** Template kartu aktif (desain upload global) — bila ada, latar = gambar upload. */
    template?: CardTemplatePdfConfig | null;
  };
  /** Data URL foto anggota (base64) — opsional, fallback ke placeholder "FOTO". */
  photoDataUrl?: string | null;
  /** Data URL latar desain upload sisi depan/belakang (di-resolve service). */
  frontImageDataUrl?: string | null;
  backImageDataUrl?: string | null;
  /** Data URL tanda tangan & stempel (cap) yang di-upload — opsional, fallback teks "ttd"/"STEMPEL". */
  signatureDataUrl?: string | null;
  stampDataUrl?: string | null;
  /** Visual strip dari tabel tingkatan — bila kosong fallback ke mapping bawaan. */
  levelVisual?: { stripCount: number; color: string; label?: string } | null;
}

const h = React.createElement;

/**
 * Microprint / guilloche border — beberapa lapis garis tipis anti-fotokopi
 * (didukung penuh @react-pdf/renderer: Svg + Rect + strokeDasharray).
 */
function guillocheBorder(strokeColor: string) {
  return h(
    Svg,
    { width: 856, height: 540, viewBox: '0 0 856 540', style: { position: 'absolute', top: 0, left: 0 } },
    h(Rect, { x: 16, y: 16, width: 824, height: 508, rx: 22, fill: 'none', stroke: strokeColor, strokeWidth: 1.2, opacity: 0.45 }),
    h(Rect, { x: 22, y: 22, width: 812, height: 496, rx: 18, fill: 'none', stroke: strokeColor, strokeWidth: 0.8, strokeDasharray: '3,5', opacity: 0.35 }),
    h(Rect, { x: 27, y: 27, width: 802, height: 486, rx: 14, fill: 'none', stroke: strokeColor, strokeWidth: 0.5, opacity: 0.2 }),
  );
}

/** Hologram / foil shimmer — gradient diagonal semi-transparan. */
function ShimmerOverlay({ width, height, id, colors }: { width: number; height: number; id: string; colors: [string, string, string] }) {
  return h(
    Svg,
    { width, height, viewBox: `0 0 ${width} ${height}`, style: { position: 'absolute', top: 0, left: 0 } },
    h(
      Defs,
      null,
      h(
        LinearGradient,
        { id, x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
        h(Stop, { offset: '0%', stopColor: colors[0] }),
        h(Stop, { offset: '50%', stopColor: colors[1] }),
        h(Stop, { offset: '100%', stopColor: colors[2] }),
      ),
    ),
    h(Rect, { x: 0, y: 0, width, height, fill: `url(#${id})` }),
  );
}

/** Konten sisi depan (tanpa Page — dipakai untuk halaman normal & gabungan). */
function buildFrontSide(props: MemberCardPdfProps) {
  const { member, cardConfig } = props;
  const tanggalLahirStr = member.tanggalLahir
    ? new Date(member.tanggalLahir).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '-';
  const ttl = member.tempatLahir
    ? `${member.tempatLahir}, ${tanggalLahirStr}`
    : tanggalLahirStr;
  const distrik = member.distrik || member.wilayah || 'THS-THM';
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 5);
  const validUntilStr = validUntil.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const lv = getLevelVisual(member.tingkat, props.levelVisual);
  const levelStrips = Array.from({ length: lv.stripCount }, (_, i) =>
    h(View, { key: i, style: [styles.levelStrip, { backgroundColor: lv.color }] }),
  );

  const template = cardConfig.template || null;
  return [
    // Latar: gambar desain upload (template aktif) ATAU dekorasi bawaan
    ...(props.frontImageDataUrl
      ? [h(Image, { key: 'bgImg', src: props.frontImageDataUrl, style: styles.bgImage })]
      : [
          h(View, { key: 'bg1', style: styles.bgCircle1 }),
          h(View, { key: 'bg2', style: styles.bgCircle2 }),
          h(View, { key: 'top', style: styles.topBar }),
          h(View, { key: 'bottom', style: styles.bottomBar }),
        ]),
    // Guilloche / microprint border (lapis garis tipis anti-fotokopi)
    ...(template?.guilloche?.enabledFront === false
      ? []
      : [guillocheBorder(template?.guilloche?.strokeFront || 'rgba(29,78,216,0.4)')]),
    // Watermark — peta Indonesia
    ...(template?.watermark?.enabledFront === false
      ? []
      : [
          h(
            View,
            { key: 'wm', style: styles.watermark },
            h(Image, { src: MAP_INDONESIA_DATA_URL, style: styles.watermarkLogo }),
          ),
        ]),
    // Header — 4 baris + logo
    h(
      View,
      { key: 'header', style: styles.headerRow },
      h(
        View,
        { key: 'logo', style: styles.logo },
        h(Image, { src: KTA_LOGO_DATA_URL, style: styles.logoImg }),
        h(ShimmerOverlay, { width: 48, height: 48, id: 'logoShimmerFront', colors: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)'] }),
      ),
      h(
        View,
        { key: 'headertxt' },
        h(Text, { style: styles.row1 }, 'KARTU TANDA ANGGOTA'),
        h(Text, { style: styles.row2 }, 'ORGANISASI PENCAK SILAT PENDIDIKAN'),
        h(Text, { style: styles.orgName }, 'TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA'),
        h(Text, { style: styles.distrikName }, `DISTRIK KEUSKUPAN ${distrik.toUpperCase()}`),
      ),
    ),
    // Photo besar kiri (tanpa bingkai) + photo kecil kanan atas (sejajar No. Anggota)
    h(
      View,
      { key: 'photo', style: styles.photoBox },
      props.photoDataUrl
        ? h(Image, { src: props.photoDataUrl, style: styles.photoImage })
        : h(Text, { style: styles.photoPlaceholder }, 'FOTO'),
    ),
    h(
      View,
      { key: 'photo-small', style: styles.photoBoxSmall },
      props.photoDataUrl
        ? h(Image, { src: props.photoDataUrl, style: styles.photoImageSmall })
        : h(Text, { style: styles.photoPlaceholder }, 'FOTO'),
    ),
    // Level rank — kanan atas sejajar data No. Anggota; teks nama tingkat selebar strip; sembunyi utk 'Anggota'
    ...(levelStrips.length > 0
      ? [
          h(
            View,
            { key: 'rank', style: styles.rankBox },
            h(Text, { style: styles.rankName }, (member.tingkat || '').toUpperCase()),
            h(View, { key: 'rank-strips', style: styles.levelStrips }, levelStrips),
          ),
        ]
      : []),
    // Info — No. Anggota, Nama, Tempat-Tanggal Lahir (gabung), Ranting, Wilayah — UPPERCASE (Distrik sudah di header)
    h(
      View,
      { key: 'info', style: styles.infoSection },
      h(
        View,
        { key: 'r1', style: styles.infoRow },
        h(Text, { style: styles.infoLabel }, 'No. Anggota'),
        h(Text, { style: styles.infoValueStrong }, (member.nomorAnggota || '-').toUpperCase()),
      ),
      // Nama + Jenis Kelamin sejajar (dua kolom baris sama)
      h(
        View,
        { key: 'r2', style: styles.infoPair },
        h(
          View,
          { key: 'n', style: styles.infoPairLeft },
          h(Text, { style: styles.infoLabel }, 'Nama'),
          h(Text, { style: styles.infoValue }, (member.namaLengkap || '-').toUpperCase()),
        ),
        h(
          View,
          { key: 'jk', style: styles.jkBox },
          h(Text, { style: styles.jkLabel }, 'JK'),
          h(Text, { style: styles.jkValue }, member.jenisKelamin === 'P' ? 'P' : 'L'),
        ),
      ),
      h(
        View,
        { key: 'r3', style: styles.infoRow },
        h(Text, { style: styles.infoLabel }, 'Tempat, Tanggal Lahir'),
        h(Text, { style: styles.infoValue }, (ttl || '-').toUpperCase()),
      ),
      h(
        View,
        { key: 'r4', style: styles.infoRow },
        h(Text, { style: styles.infoLabel }, 'Ranting'),
        h(Text, { style: styles.infoValue }, (member.ranting || '-').toUpperCase()),
      ),
      h(
        View,
        { key: 'r5', style: styles.infoRow },
        h(Text, { style: styles.infoLabel }, 'Wilayah'),
        h(Text, { style: styles.infoValue }, (member.wilayah || '-').toUpperCase()),
      ),
    ),
    // Bottom left — masa berlaku
    h(
      View,
      { key: 'valid', style: styles.bottomInfo },
      h(Text, { style: styles.validUntil }, 'Berlaku sampai'),
      h(Text, { style: styles.validUntilValue }, validUntilStr),
    ),
    // Bottom right — penandatangan (1-3) + stempel
    // Bottom right — stempel 4 cm (cap di-upload) + ttd di atasnya + nama/jabatan di bawah
    h(
      View,
      { key: 'sig', style: styles.signature },
      h(
        Text,
        { key: 'st1', style: styles.sigTitle1 },
        `KOORDINATORAT DISTRIK THS-THM`,
      ),
      h(
        Text,
        { key: 'st2', style: styles.sigTitle2 },
        `KEUSKUPAN ${(member.distrik || 'THS-THM').replace(/^keuskupan\s*/i, '').toUpperCase()}`,
      ),
      h(
        View,
        { key: 'sigwrap', style: styles.sigWrap },
        h(
          View,
          { key: 'stamp', style: styles.stamp },
          props.stampDataUrl
            ? h(Image, { src: props.stampDataUrl, style: styles.stampImg })
            : h(Text, { style: styles.stampText }, 'STEMPEL'),
        ),
        props.signatureDataUrl
          ? [
              h(Image, { src: props.signatureDataUrl, style: styles.sigImage }),
              h(Image, { src: props.signatureDataUrl, style: styles.sigImage2 }),
            ]
          : h(Text, { key: 'sigttd', style: styles.sigText }, 'ttd'),
      ),
      ...(cardConfig.signers && cardConfig.signers.length > 0
        ? cardConfig.signers
            .filter((s) => s && (s.signerName || s.signerTitle))
            .map((s, i) =>
              h(
                View,
                { key: `sig-${i}`, style: { position: 'absolute', left: 0, bottom: i * 34, width: '100%', alignItems: 'flex-start' } },
                // Nama penandatangan (underline) + jabatan — keduanya tampil di bawah stempel, font sama dgn "Berlaku sampai"
                s.signerName
                  ? h(Text, { style: styles.signerName }, (s.signerName || '').toUpperCase())
                  : null,
                s.signerTitle ? h(Text, { style: styles.signerTitle }, s.signerTitle.toUpperCase()) : null,
              ),
            )
        : [
            h(
              View,
              { key: 'sig-fallback', style: { position: 'absolute', left: 0, bottom: 0, width: '100%', alignItems: 'flex-start' } },
              h(Text, { key: 'sig-n', style: styles.signerName }, (cardConfig.signerName || '').toUpperCase()),
              cardConfig.signerTitle
                ? h(Text, { key: 'sig-nt', style: styles.signerTitle }, cardConfig.signerTitle.toUpperCase())
                : null,
            ),
          ]),
    ),
  ];
}

/** Konten sisi belakang (tanpa Page). */
function buildBackSide(props: MemberCardPdfProps) {
  const { member, cardConfig } = props;
  const tanggalLahirStr = member.tanggalLahir
    ? new Date(member.tanggalLahir).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '-';
  const ttl = member.tempatLahir ? `${member.tempatLahir}, ${tanggalLahirStr}` : tanggalLahirStr;
  const dadar = [member.tempatDadar, member.tahunDadar].filter(Boolean).join(', ') || '-';
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 5);
  const validUntilStr = validUntil.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const template = cardConfig.template || null;
  return [
    // Latar: gambar desain upload (template aktif) — bila ada
    ...(props.backImageDataUrl ? [h(Image, { key: 'bgImgB', src: props.backImageDataUrl, style: styles.bgImage })] : []),
    // Guilloche / microprint border
    ...(template?.guilloche?.enabledBack === false
      ? []
      : [guillocheBorder(template?.guilloche?.strokeBack || 'rgba(191,219,254,0.4)')]),
    // Watermark peta PUTIH
    ...(template?.watermark?.enabledBack === false
      ? []
      : [
          h(
            View,
            { key: 'wm', style: styles.backWatermarkLogo },
            h(Image, { src: MAP_INDONESIA_LIGHT_DATA_URL, style: styles.backWatermarkImg }),
          ),
        ]),
    h(Text, { key: 'title', style: styles.backTitle }, 'VERIFIKASI KARTU ANGGOTA'),
    h(Text, { key: 'sub', style: styles.backSubtitle }, 'Scan QR untuk memeriksa keabsahan anggota'),
    // QR Code
    h(
      View,
      { key: 'qr', style: styles.qrSection },
      h(Image, { src: cardConfig.qrDataUrl, style: styles.qrImage }),
    ),
    // Back info
    h(
      View,
      { key: 'info', style: styles.backInfo },
      h(
        Text,
        { key: 'desc', style: styles.backDesc },
        'Halaman verifikasi publik hanya menampilkan data minimum untuk membuktikan keabsahan anggota.',
      ),
      h(
        View,
        { key: 'r1', style: styles.backRow },
        h(Text, { style: styles.backLabel }, 'TTL'),
        h(Text, { style: styles.backValue }, `: ${ttl}`),
      ),
      h(
        View,
        { key: 'r2', style: styles.backRow },
        h(Text, { style: styles.backLabel }, 'DADAR'),
        h(Text, { style: styles.backValue }, `: ${dadar}`),
      ),
      h(
        View,
        { key: 'r3', style: styles.backRow },
        h(Text, { style: styles.backLabel }, 'Status'),
        h(Text, { style: styles.backValue }, `: ${member.statusKeanggotaan === 'aktif' ? 'Aktif' : 'Nonaktif'}`),
      ),
      h(
        View,
        { key: 'r4', style: styles.backRow },
        h(Text, { style: styles.backLabel }, 'Valid s/d'),
        h(Text, { style: styles.backValue }, `: ${validUntilStr}`),
      ),
      h(
        View,
        { key: 'r5', style: styles.backRow },
        h(Text, { style: styles.backLabel }, 'Alamat'),
        h(Text, { style: styles.backValue }, `: THS-THM, ${(member.alamatDistrik || 'Distrik').toUpperCase()}`),
      ),
    ),
    // Footer
    h(
      View,
      { key: 'footer', style: styles.backFooter },
      h(
        Text,
        { key: 'ft', style: styles.footerText },
        'Jika kartu ini ditemukan, harap menghubungi sekretariat THS-THM setempat.',
      ),
      h(
        View,
        { key: 'urlbox', style: styles.footerUrlBox },
        h(Text, { key: 'ul', style: styles.footerUrlLabel }, 'URL Verifikasi'),
        h(Text, { key: 'uv', style: styles.footerUrl }, cardConfig.verificationUrl),
      ),
    ),
  ];
}

/**
 * Bangun dokumen KTA.
 * @param opts.combined — true: satu halaman 856×1080 (depan di atas, belakang di bawah)
 *   untuk menghasilkan PNG 2 sisi dalam satu gambar. false/default: 2 halaman (PDF).
 */
export function buildMemberCardPdf(props: MemberCardPdfProps, opts?: { combined?: boolean }) {
  const combined = !!opts?.combined;
  const frontSide = buildFrontSide(props);
  const backSide = buildBackSide(props);

  if (combined) {
    return h(
      Document,
      null,
      h(
        Page,
        { size: [856, 1080], style: { width: 856, height: 1080, padding: 0, position: 'relative', backgroundColor: WHITE } },
        // Front (top half)
        h(
          View,
          { key: 'front', style: { position: 'absolute', top: 0, left: 0, width: 856, height: 540, backgroundColor: WHITE } },
          frontSide,
        ),
        // Back (bottom half)
        h(
          View,
          { key: 'back', style: { position: 'absolute', top: 540, left: 0, width: 856, height: 540 } },
          backSide,
        ),
      ),
    );
  }

  return h(Document, null, [
    h(Page, { size: [856, 540], style: styles.pageFront, key: 'front' }, frontSide),
    h(Page, { size: [856, 540], style: styles.pageBack, key: 'back' }, backSide),
  ]);
}
