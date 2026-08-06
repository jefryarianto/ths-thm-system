/* eslint-disable @typescript-eslint/no-require-imports */
const React = require('react');
const { Document, Page, View, Text, Image, StyleSheet } = require('@react-pdf/renderer');

// ── Palette (sesuai template desain kartu) ──
const BLUE_900 = '#1e3a5f';
const BLUE_800 = '#1e4a7a';
const WHITE = '#ffffff';
const YELLOW_500 = '#eab308';
const SLATE_800 = '#1e293b';

/** Tingkat Tapak Suci → visual balok pada kartu (identik dengan web & mobile). */
const TINGKAT_LEVEL: Record<string, { stripCount: number; color: string; label: string }> = {
  Pratama: { stripCount: 2, color: '#b91c1c', label: 'Balok Merah II' },
  Tamtama: { stripCount: 2, color: '#1d4ed8', label: 'Balok Biru II' },
  Muda:    { stripCount: 2, color: '#ca8a04', label: 'Balok Kuning II' },
  Madya:   { stripCount: 2, color: '#15803d', label: 'Balok Hijau II' },
  Utama:   { stripCount: 2, color: '#1e293b', label: 'Balok Hitam II' },
};

function getLevelVisual(tingkat?: string | null) {
  return (tingkat && TINGKAT_LEVEL[tingkat]) || { stripCount: 1, color: '#94a3b8', label: 'Balok' };
}

const styles = StyleSheet.create({
  // ── Front Side ──
  pageFront: {
    width: 856,
    height: 540,
    padding: 0,
    backgroundColor: WHITE,
    position: 'relative',
  },
  bgCircle1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(6,182,212,0.15)',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -110,
    left: -80,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(29,78,216,0.08)',
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
  borderInner: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 18,
    bottom: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(250,204,21,0.6)',
  },
  watermark: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermarkText: {
    fontSize: 100,
    fontWeight: 'heavy',
    color: BLUE_900,
    opacity: 0.06,
  },
  headerRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
    paddingHorizontal: 40,
    paddingTop: 24,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fde047',
    borderWidth: 4,
    borderColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 9,
    fontWeight: 'heavy',
    color: BLUE_900,
  },
  orgName: {
    color: WHITE,
    fontSize: 22,
    fontWeight: 'heavy',
    letterSpacing: 0.5,
    lineHeight: 1.1,
  },
  distrikName: {
    color: WHITE,
    fontSize: 17,
    fontWeight: 'semibold',
    opacity: 0.95,
    marginTop: 2,
  },
  titleBar: {
    position: 'absolute',
    top: 92,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  titleBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 32,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: YELLOW_500,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'heavy',
    color: BLUE_900,
    letterSpacing: 4,
  },
  photoBox: {
    position: 'absolute',
    left: 40,
    top: 165,
    width: 185,
    height: 235,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: WHITE,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImage: {
    width: 177,
    height: 227,
  },
  photoPlaceholder: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  levelStrips: {
    position: 'absolute',
    left: 40,
    top: 412,
    width: 185,
  },
  levelStrip: {
    height: 14,
    marginBottom: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  infoSection: {
    position: 'absolute',
    left: 255,
    top: 162,
    right: 40,
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'flex-start',
  },
  infoLabel: {
    width: 120,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a5f',
  },
  infoValue: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'semibold',
    color: SLATE_800,
  },
  infoValueStrong: {
    flex: 1,
    fontSize: 25,
    fontWeight: 'heavy',
    color: '#1e3a5f',
  },
  bottomInfo: {
    position: 'absolute',
    left: 40,
    bottom: 40,
  },
  validUntil: {
    color: WHITE,
    fontSize: 15,
    opacity: 0.9,
  },
  validUntilValue: {
    color: WHITE,
    fontSize: 22,
    fontWeight: 'heavy',
    marginTop: 2,
  },
  signature: {
    position: 'absolute',
    right: 48,
    bottom: 36,
    alignItems: 'center',
  },
  sigWrap: {
    position: 'relative',
    width: 192,
    height: 80,
  },
  sigText: {
    position: 'absolute',
    left: 32,
    top: 0,
    fontSize: 38,
    fontStyle: 'italic',
    transform: 'rotate(-8deg)',
    color: 'rgba(15,23,42,0.8)',
  },
  stamp: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(191,219,254,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#dbeafe',
    transform: 'rotate(-12deg)',
  },
  signerName: {
    color: WHITE,
    fontSize: 16,
    fontWeight: 'heavy',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.6)',
    paddingTop: 4,
  },
  signerTitle: {
    color: WHITE,
    fontSize: 13,
    fontWeight: 'semibold',
    opacity: 0.95,
    marginTop: 2,
  },

  // ── Back Side ──
  pageBack: {
    width: 856,
    height: 540,
    padding: 0,
    backgroundColor: BLUE_900,
    position: 'relative',
  },
  backTitle: {
    position: 'absolute',
    top: 28,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: WHITE,
    fontSize: 28,
    fontWeight: 'heavy',
    letterSpacing: 4,
  },
  backSubtitle: {
    position: 'absolute',
    top: 66,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: WHITE,
    fontSize: 15,
    opacity: 0.9,
  },
  qrSection: {
    position: 'absolute',
    left: 48,
    top: 145,
    width: 210,
    height: 210,
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: BLUE_900,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: 170,
    height: 170,
  },
  backInfo: {
    position: 'absolute',
    left: 300,
    top: 145,
    right: 48,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,219,254,0.5)',
    padding: 24,
  },
  backDesc: {
    fontSize: 18,
    lineHeight: 1.5,
    color: '#334155',
    marginBottom: 16,
  },
  backRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  backLabel: {
    width: 105,
    fontSize: 18,
    fontWeight: 'heavy',
    color: '#1e3a5f',
  },
  backValue: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'semibold',
    color: SLATE_800,
  },
  backFooter: {
    position: 'absolute',
    left: 48,
    right: 48,
    bottom: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerText: {
    color: WHITE,
    fontSize: 15,
    opacity: 0.95,
    maxWidth: 610,
    lineHeight: 1.4,
  },
  footerUrlBox: {
    alignItems: 'flex-end',
  },
  footerUrlLabel: {
    color: WHITE,
    fontSize: 13,
    opacity: 0.8,
  },
  footerUrl: {
    color: WHITE,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
});

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
    statusKeanggotaan: string;
  };
  cardConfig: {
    nomorDokumen: string;
    qrDataUrl: string;
    verificationUrl: string;
    signerName: string;
    signerTitle: string;
  };
  /** Data URL foto anggota (base64) — opsional, fallback ke placeholder "FOTO". */
  photoDataUrl?: string | null;
}

const h = React.createElement;

export function buildMemberCardPdf({ member, cardConfig, photoDataUrl }: MemberCardPdfProps) {
  const tanggalLahirStr = member.tanggalLahir
    ? new Date(member.tanggalLahir).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-';

  const ttl = member.tempatLahir
    ? `${member.tempatLahir}, ${tanggalLahirStr}`
    : tanggalLahirStr;

  const dadar = [member.tempatDadar, member.tahunDadar].filter(Boolean).join(', ') || '-';

  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 5);
  const validUntilStr = validUntil.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const distrik = member.distrik || member.wilayah || 'THS-THM';

  const lv = getLevelVisual(member.tingkat);
  const levelStrips = Array.from({ length: lv.stripCount }, (_, i) =>
    h(View, { key: i, style: [styles.levelStrip, { backgroundColor: lv.color }] }),
  );

  return h(Document, null, [
    // ── Front side ──
    h(
      Page,
      { size: [856, 540], style: styles.pageFront, key: 'front' },
      // Backgrounds
      h(View, { style: styles.bgCircle1 }),
      h(View, { style: styles.bgCircle2 }),
      h(View, { style: styles.topBar }),
      h(View, { style: styles.bottomBar }),
      h(View, { style: styles.borderInner }),
      h(
        View,
        { style: styles.watermark },
        h(Text, { style: styles.watermarkText }, 'THS'),
      ),
      // Header
      h(
        View,
        { style: styles.headerRow },
        h(
          View,
          { style: styles.logo },
          h(View, { style: styles.logoInner }, h(Text, null, 'THS')),
        ),
        h(
          View,
          null,
          h(Text, { style: styles.orgName }, 'TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA'),
          h(Text, { style: styles.distrikName }, `DISTRIK ${distrik.toUpperCase()}`),
        ),
      ),
      // Title
      h(
        View,
        { style: styles.titleBar },
        h(
          View,
          { style: styles.titleBadge },
          h(Text, { style: styles.titleText }, 'KARTU TANDA ANGGOTA'),
        ),
      ),
      // Photo
      h(
        View,
        { style: styles.photoBox },
        photoDataUrl
          ? h(Image, { src: photoDataUrl, style: styles.photoImage })
          : h(Text, { style: styles.photoPlaceholder }, 'FOTO'),
      ),
      // Level strips (balok tingkat — sesuai template desain)
      h(View, { style: styles.levelStrips }, levelStrips),
      // Info
      h(
        View,
        { style: styles.infoSection },
        h(
          View,
          { style: styles.infoRow },
          h(Text, { style: styles.infoLabel }, 'Nama'),
          h(Text, { style: styles.infoValueStrong }, `: ${member.namaLengkap}`),
        ),
        h(
          View,
          { style: styles.infoRow },
          h(Text, { style: styles.infoLabel }, 'No. Anggota'),
          h(Text, { style: styles.infoValue }, `: ${member.nomorAnggota}`),
        ),
        h(
          View,
          { style: styles.infoRow },
          h(Text, { style: styles.infoLabel }, 'Ranting'),
          h(Text, { style: styles.infoValue }, `: ${member.ranting || '-'}`),
        ),
        h(
          View,
          { style: styles.infoRow },
          h(Text, { style: styles.infoLabel }, 'Wilayah'),
          h(Text, { style: styles.infoValue }, `: ${member.wilayah || '-'}`),
        ),
        h(
          View,
          { style: styles.infoRow },
          h(Text, { style: styles.infoLabel }, 'Distrik'),
          h(Text, { style: styles.infoValue }, `: ${distrik}`),
        ),
      ),
      // Bottom left — masa berlaku
      h(
        View,
        { style: styles.bottomInfo },
        h(Text, { style: styles.validUntil }, 'Berlaku sampai'),
        h(Text, { style: styles.validUntilValue }, validUntilStr),
      ),
      // Bottom right — penandatangan + stempel
      h(
        View,
        { style: styles.signature },
        h(
          View,
          { style: styles.sigWrap },
          h(Text, { style: styles.sigText }, 'ttd'),
          h(View, { style: styles.stamp }, h(Text, { style: styles.stampText }, 'STEMPEL')),
        ),
        h(Text, { style: styles.signerName }, cardConfig.signerName),
        h(Text, { style: styles.signerTitle }, cardConfig.signerTitle),
      ),
    ),
    // ── Back side ──
    h(
      Page,
      { size: [856, 540], style: styles.pageBack, key: 'back' },
      h(View, { style: styles.borderInner }),
      h(Text, { style: styles.backTitle }, 'VERIFIKASI KARTU ANGGOTA'),
      h(Text, { style: styles.backSubtitle }, 'Scan QR untuk memeriksa keabsahan anggota'),
      // QR Code
      h(
        View,
        { style: styles.qrSection },
        h(Image, { src: cardConfig.qrDataUrl, style: styles.qrImage }),
      ),
      // Back info
      h(
        View,
        { style: styles.backInfo },
        h(
          Text,
          { style: styles.backDesc },
          'Halaman verifikasi publik hanya menampilkan data minimum untuk membuktikan keabsahan anggota.',
        ),
        h(
          View,
          { style: styles.backRow },
          h(Text, { style: styles.backLabel }, 'TTL'),
          h(Text, { style: styles.backValue }, `: ${ttl}`),
        ),
        h(
          View,
          { style: styles.backRow },
          h(Text, { style: styles.backLabel }, 'DADAR'),
          h(Text, { style: styles.backValue }, `: ${dadar}`),
        ),
        h(
          View,
          { style: styles.backRow },
          h(Text, { style: styles.backLabel }, 'Status'),
          h(Text, { style: styles.backValue }, `: ${member.statusKeanggotaan === 'aktif' ? 'Aktif' : 'Nonaktif'}`),
        ),
        h(
          View,
          { style: styles.backRow },
          h(Text, { style: styles.backLabel }, 'Valid s/d'),
          h(Text, { style: styles.backValue }, `: ${validUntilStr}`),
        ),
      ),
      // Footer
      h(
        View,
        { style: styles.backFooter },
        h(
          Text,
          { style: styles.footerText },
          'Jika kartu ini ditemukan, harap menghubungi sekretariat THS-THM setempat.',
        ),
        h(
          View,
          { style: styles.footerUrlBox },
          h(Text, { style: styles.footerUrlLabel }, 'URL Verifikasi'),
          h(Text, { style: styles.footerUrl }, cardConfig.verificationUrl),
        ),
      ),
    ),
  ]);
}
