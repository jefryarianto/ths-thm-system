/* eslint-disable @typescript-eslint/no-require-imports */
const React = require('react');
const { Document, Page, View, Text, Image, StyleSheet } = require('@react-pdf/renderer');

// Colors
const BLUE_900 = '#1e3a5f';
const BLUE_800 = '#1e4a7a';
const CYAN_500 = '#06b6d4';
const YELLOW_400 = '#facc15';
const WHITE = '#ffffff';

const styles = StyleSheet.create({
  // ── Front Side ──
  pageFront: {
    width: 856,
    height: 540,
    padding: 0,
    backgroundColor: WHITE,
    position: 'relative',
  },
  headerBar: {
    height: 60,
    backgroundColor: BLUE_900,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    gap: 12,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: YELLOW_400,
    borderWidth: 2,
    borderColor: BLUE_900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BLUE_800,
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 8,
    fontWeight: 'bold',
    color: BLUE_900,
  },
  orgName: {
    color: WHITE,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  distrikName: {
    color: WHITE,
    fontSize: 13,
    opacity: 0.9,
  },
  titleBar: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  titleBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 24,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: YELLOW_400,
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BLUE_900,
    letterSpacing: 3,
  },
  photoBox: {
    position: 'absolute',
    left: 30,
    top: 135,
    width: 160,
    height: 200,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: WHITE,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholder: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoSection: {
    position: 'absolute',
    left: 220,
    top: 130,
    right: 30,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  infoLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: 'bold',
    color: BLUE_900,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'semibold',
    color: '#1e293b',
  },
  infoValueStrong: {
    fontSize: 20,
    fontWeight: 'black',
    color: BLUE_900,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: BLUE_900,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
  },
  validUntil: {
    color: WHITE,
    fontSize: 12,
    opacity: 0.9,
  },
  validUntilValue: {
    color: WHITE,
    fontSize: 18,
    fontWeight: 'bold',
  },
  signerSection: {
    alignItems: 'center',
  },
  signerName: {
    color: WHITE,
    fontSize: 13,
    fontWeight: 'bold',
  },
  signerTitle: {
    color: WHITE,
    fontSize: 10,
    opacity: 0.9,
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
    top: 24,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: WHITE,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  backSubtitle: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: WHITE,
    fontSize: 12,
    opacity: 0.85,
  },
  qrSection: {
    position: 'absolute',
    left: 40,
    top: 100,
    width: 180,
    height: 180,
    backgroundColor: WHITE,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: 160,
    height: 160,
  },
  backInfo: {
    position: 'absolute',
    left: 260,
    top: 100,
    right: 30,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 8,
    padding: 16,
  },
  backRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  backLabel: {
    width: 80,
    fontSize: 14,
    fontWeight: 'bold',
    color: BLUE_900,
  },
  backValue: {
    fontSize: 14,
    color: '#1e293b',
  },
  backFooter: {
    position: 'absolute',
    left: 30,
    right: 30,
    bottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerText: {
    color: WHITE,
    fontSize: 11,
    opacity: 0.9,
    maxWidth: 500,
  },
  footerUrl: {
    color: WHITE,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  footerUrlLabel: {
    color: WHITE,
    fontSize: 10,
    opacity: 0.7,
  },
});

interface MemberCardPdfProps {
  member: {
    namaLengkap: string;
    nomorAnggota: string;
    tempatLahir?: string | null;
    tanggalLahir?: string | null;
    jenisKelamin: string;
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
}

const h = React.createElement;

export function buildMemberCardPdf({ member, cardConfig }: MemberCardPdfProps) {
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

  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 5);

  const distrik = member.distrik || member.wilayah || 'THS-THM';

  return h(Document, null, [
    // Front side
    h(
      Page,
      { size: [856, 540], style: styles.pageFront, key: 'front' },
      // Header bar
      h(
        View,
        { style: styles.headerBar },
        h(
          View,
          { style: styles.logoCircle },
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
        h(Text, { style: styles.photoPlaceholder }, 'FOTO'),
      ),
      // Info
      h(
        View,
        { style: styles.infoSection },
        h(
          View,
          { style: styles.infoRow },
          h(Text, { style: styles.infoLabel }, 'Nama'),
          h(Text, { style: styles.infoValueStrong }, member.namaLengkap),
        ),
        h(
          View,
          { style: styles.infoRow },
          h(Text, { style: styles.infoLabel }, 'No. Anggota'),
          h(Text, { style: styles.infoValue }, member.nomorAnggota),
        ),
        h(
          View,
          { style: styles.infoRow },
          h(Text, { style: styles.infoLabel }, 'Ranting'),
          h(Text, { style: styles.infoValue }, member.ranting || '-'),
        ),
        h(
          View,
          { style: styles.infoRow },
          h(Text, { style: styles.infoLabel }, 'Wilayah'),
          h(Text, { style: styles.infoValue }, member.wilayah || '-'),
        ),
        h(
          View,
          { style: styles.infoRow },
          h(Text, { style: styles.infoLabel }, 'Distrik'),
          h(Text, { style: styles.infoValue }, distrik),
        ),
      ),
      // Bottom bar
      h(
        View,
        { style: styles.bottomBar },
        h(
          View,
          null,
          h(Text, { style: styles.validUntil }, 'Berlaku sampai'),
          h(
            Text,
            { style: styles.validUntilValue },
            validUntil.toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
          ),
        ),
        h(
          View,
          { style: styles.signerSection },
          h(Text, { style: styles.signerName }, cardConfig.signerName),
          h(Text, { style: styles.signerTitle }, cardConfig.signerTitle),
        ),
      ),
    ),
    // Back side
    h(
      Page,
      { size: [856, 540], style: styles.pageBack, key: 'back' },
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
          View,
          { style: styles.backRow },
          h(Text, { style: styles.backLabel }, 'TTL'),
          h(Text, { style: styles.backValue }, `: ${ttl}`),
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
          h(Text, { style: styles.backLabel }, 'No. Dok'),
          h(Text, { style: styles.backValue }, `: ${cardConfig.nomorDokumen}`),
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
          null,
          h(Text, { style: styles.footerUrlLabel }, 'URL Verifikasi'),
          h(Text, { style: styles.footerUrl }, cardConfig.verificationUrl),
        ),
      ),
    ),
  ]);
}