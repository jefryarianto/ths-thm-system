/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Builder PDF Sertifikat Penguji - A4 portrait.
 * Mengikuti Pedoman Administrasi Kesekretariatan THS-THM No 3 Tahun 2004,
 * Lampiran 6: Sertifikat Penguji.
 * Penerbit: Dewan Pendiri + Koordinatorat Nasional.
 * Penandatangan: Dewan Pendiri THS-THM + Koordinator Nasional THS-THM.
 */
const React = require('react');
const { Document, Page, View, Text, Image, StyleSheet } = require('@react-pdf/renderer');
import { fillTemplateText } from './template-text';

const BLUE_900 = '#1e3a5f';
const BLUE_950 = '#0f1f3a';
const YELLOW_400 = '#facc15';
const WHITE = '#ffffff';

const styles = StyleSheet.create({
  page: { width: 1188, height: 1680, padding: 0, backgroundColor: WHITE, position: 'relative' },
  backgroundImage: { position: 'absolute', left: 0, top: 0, width: 1188, height: 1680, objectFit: 'fill' },
  headerSection: { position: 'absolute', top: 50, left: 70, right: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: YELLOW_400, borderWidth: 5, borderColor: BLUE_900, alignItems: 'center', justifyContent: 'center' },
  logoInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: WHITE, borderWidth: 1, borderColor: BLUE_900, alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 'bold', color: BLUE_900 },
  orgName: { fontSize: 26, fontWeight: 'black', color: BLUE_950, textAlign: 'center', letterSpacing: 1 },
  districtName: { fontSize: 20, fontWeight: 'bold', color: BLUE_900, textAlign: 'center', marginTop: 4 },
  titleSection: { position: 'absolute', top: 200, left: 0, right: 0, textAlign: 'center' },
  sertifikatText: { fontSize: 55, fontWeight: 'black', color: BLUE_950, letterSpacing: 3 },
  pengujiText: { fontSize: 32, fontWeight: 'black', color: YELLOW_400, letterSpacing: 6, marginTop: 6 },
  nomorText: { fontSize: 15, color: '#64748b', marginTop: 14 },
  bodySection: { position: 'absolute', top: 380, left: 80, right: 80, textAlign: 'center' },
  diberikanText: { fontSize: 20, color: '#475569', marginBottom: 18 },
  namaBox: { paddingHorizontal: 50, paddingVertical: 14, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, alignSelf: 'center' },
  namaText: { fontSize: 40, fontWeight: 'black', color: BLUE_950, letterSpacing: 1 },
  kualifikasiText: { fontSize: 18, color: '#475569', marginTop: 22, lineHeight: 1.6 },
  infoGrid: { position: 'absolute', left: 80, right: 80, top: 600, flexDirection: 'row', gap: 12 },
  infoBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 12, alignItems: 'center' },
  infoLabel: { fontSize: 11, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  infoValue: { fontSize: 15, fontWeight: 'black', color: BLUE_950, marginTop: 4 },
  infoValueHighlight: { fontSize: 22, fontWeight: 'black', color: BLUE_950, marginTop: 4 },
  signerSection: { position: 'absolute', left: 70, right: 70, bottom: 90, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  signerBlock: { width: 360, alignItems: 'center' },
  tanggalText: { fontSize: 14, color: '#64748b', textAlign: 'right' },
});

interface SertifikatPengujiProps {
  recipientName: string;
  certificateNumber: string;
  examLevel: string;
  issuedDate: string;
  ranting: string;
  districtName: string;
  signers: Array<{ signerName: string; signerTitle: string }>;
  qrDataUrl?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  template?: { orgNama?: string; orgAlamat?: string; judul?: string; body?: string; background?: string };
}

const h = React.createElement;

export function buildSertifikatPengujiPdf(props: SertifikatPengujiProps) {
  const { recipientName, certificateNumber, examLevel, issuedDate, ranting, districtName, signers, qrDataUrl, template } = props;
  const orgNama = template?.orgNama || 'TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA';
  const orgAlamat = template?.orgAlamat;
  const background = template?.background;
  const bodyText = template?.body
    ? fillTemplateText(template.body, { nama: recipientName, jenjang: examLevel, ranting, distrik: districtName })
    : undefined;
  const signerSectionChildren = (signers || []).map((s, i) => h(View, { key: `signer-${i}`, style: styles.signerBlock }, s.signerName ? h(Text, { style: { fontSize: 15, fontWeight: 'bold', color: BLUE_950 } }, s.signerName) : null, s.signerTitle ? h(Text, { style: { fontSize: 12, color: '#64748b', marginTop: 2 } }, s.signerTitle) : null));

  return h(Document, null,
    h(Page, { size: [1188, 1680], style: styles.page, key: 'front' },
      background ? h(Image, { key: 'bg', src: background, style: styles.backgroundImage }) : null,
      h(View, { style: styles.headerSection },
        h(View, { style: styles.logoCircle }, h(Text, { style: styles.logoInner }, 'THS')),
        h(Text, { style: styles.orgName }, orgNama),
        h(Text, { style: styles.districtName }, 'DEWAN PENDIRI - KOORDINATORAT NASIONAL')),
      h(View, { style: styles.titleSection },
        h(Text, { style: styles.sertifikatText }, 'SERTIFIKAT'),
        h(Text, { style: styles.pengujiText }, 'PENGUJI'),
        h(Text, { style: styles.nomorText }, `Nomor: ${certificateNumber}`)),
      h(View, { style: styles.bodySection },
        h(Text, { style: styles.diberikanText }, 'Sertifikat ini diberikan kepada'),
        h(View, { style: styles.namaBox }, h(Text, { style: styles.namaText }, recipientName)),
        bodyText
          ? h(Text, { style: { fontSize: 16, color: '#475569', marginTop: 22, lineHeight: 1.7 } }, bodyText)
          : h(Text, { style: styles.kualifikasiText }, `Yang telah memenuhi kualifikasi sebagai Penguji tingkat ${examLevel}.`),
        h(View, { style: styles.infoGrid },
          h(View, { style: styles.infoBox },
            h(Text, { style: styles.infoLabel }, 'Ranting'),
            h(Text, { style: styles.infoValue }, ranting)),
          h(View, { style: styles.infoBox },
            h(Text, { style: styles.infoLabel }, 'Distrik'),
            h(Text, { style: styles.infoValue }, districtName)),
          h(View, { style: styles.infoBox },
            h(Text, { style: styles.infoLabel }, 'Jenjang Penguji'),
            h(Text, { style: styles.infoValueHighlight }, examLevel)))),
      h(View, { style: styles.signerSection }, ...signerSectionChildren),
      h(Text, { style: styles.tanggalText, position: 'absolute' as const, right: 80, bottom: 70 }, issuedDate)));
}

