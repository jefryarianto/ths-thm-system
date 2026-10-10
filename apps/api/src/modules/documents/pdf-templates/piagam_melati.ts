/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Builder PDF Piagam Penghargaan Melati - A4 landscape (1188x840 px).
 * Mengikuti Pedoman Administrasi Kesekretariatan THS-THM No 3 Tahun 2004,
 * Bagian VI.4: Piagam Penghargaan Melati Tingkat 1-5.
 * Makna: Bunga Melati adalah lambang kesetiaan.
 * T1: 5 tahun, T2: 10 tahun, T3: 20 tahun, T4: 30 tahun, T5: 40 tahun.
 * Penerbit bervariasi Distrik (T1-T2) / Nasional (T3-T5).
 * Penandatangan per pedoman nasional.
 */
const React = require('react');
const { Document, Page, View, Text, Image, StyleSheet } = require('@react-pdf/renderer');
import { fillTemplateText } from './template-text';

const BLUE_900 = '#1e3a5f';
const BLUE_950 = '#0f1f3a';
const YELLOW_400 = '#facc15';
const WHITE = '#ffffff';

const LEVEL_YEARS: Record<number, string> = {
  1: 'Lima tahun telah berlalu, penuh kerja keras, bersimbah peluh berurai air mata haru dan bahagia.',
  2: 'Sepuluh tahun telah berlalu, penuh kerja keras, bersimbah peluh berurai air mata haru dan bahagia.',
  3: 'Dua puluh tahun telah berlalu, penuh kerja keras, bersimbah peluh berurai air mata haru dan bahagia.',
  4: 'Tiga puluh tahun telah berlalu, penuh kerja keras, bersimbah peluh berurai air mata haru dan bahagia.',
  5: 'Empat puluh tahun telah berlalu, penuh kerja keras, bersimbah peluh berurai air mata haru dan bahagia.',
};

const LEVEL_LABELS: Record<number, string> = {
  1: 'MELATI TINGKAT 1 - MASA AKTIF 5 TAHUN',
  2: 'MELATI TINGKAT 2 - MASA AKTIF 10 TAHUN',
  3: 'MELATI TINGKAT 3 - MASA AKTIF 20 TAHUN',
  4: 'MELATI TINGKAT 4 - MASA AKTIF 30 TAHUN',
  5: 'MELATI TINGKAT 5 - MASA AKTIF 40 TAHUN',
};

const styles = StyleSheet.create({
  page: { width: 1188, height: 840, padding: 0, backgroundColor: WHITE, position: 'relative', fontFamily: 'Times-Roman' },
  backgroundImage: { position: 'absolute', left: 0, top: 0, width: 1188, height: 840, objectFit: 'fill' },
  headerSection: { position: 'absolute', top: 46, left: 70, right: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: YELLOW_400, borderWidth: 5, borderColor: BLUE_900, alignItems: 'center', justifyContent: 'center' },
  logoInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: WHITE, borderWidth: 1, borderColor: BLUE_900, alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold', color: BLUE_900 },
  orgName: { fontSize: 20, fontWeight: 'black', color: BLUE_950, textAlign: 'center', letterSpacing: 1 },
  districtName: { fontSize: 15, fontWeight: 'bold', color: BLUE_900, textAlign: 'center', marginTop: 3 },
  titleSection: { position: 'absolute', top: 160, left: 0, right: 0, textAlign: 'center' },
  piagamText: { fontSize: 42, fontWeight: 'black', color: BLUE_950, letterSpacing: 3 },
  melatiText: { fontSize: 20, fontWeight: 'black', color: YELLOW_400, letterSpacing: 2, marginTop: 4 },
  nomorText: { fontSize: 13, color: '#64748b', marginTop: 8 },
  bodySection: { position: 'absolute', top: 310, left: 70, right: 70, textAlign: 'center' },
  gloriaText: { fontSize: 16, fontWeight: 'bold', color: BLUE_900, marginBottom: 8 },
  diberikanText: { fontSize: 16, color: '#475569', marginBottom: 10 },
  namaBox: { paddingHorizontal: 46, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, alignSelf: 'center' },
  namaText: { fontSize: 32, fontWeight: 'black', color: BLUE_950, letterSpacing: 1 },
  ketText: { fontSize: 16, color: '#475569', marginTop: 14, lineHeight: 1.6 },
  signerSection: { position: 'absolute', left: 70, right: 70, bottom: 70, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  signerBlock: { width: 310, alignItems: 'center' },
  tanggalText: { fontSize: 12, color: '#64748b', textAlign: 'right' },
});

interface PiagamMelatiProps {
  recipientName: string;
  awardNumber: string;
  melatiLevel: 1 | 2 | 3 | 4 | 5;
  issuedDate: string;
  ranting: string;
  districtName: string;
  signers: Array<{ signerName: string; signerTitle: string }>;
  qrDataUrl?: string;
  template?: { orgNama?: string; orgAlamat?: string; judul?: string; body?: string; background?: string };
}

const h = React.createElement;

export function buildPiagamMelatiPdf(props: PiagamMelatiProps) {
  const { recipientName, awardNumber, melatiLevel, issuedDate, ranting, districtName, signers, qrDataUrl, template } = props;
  const orgNama = template?.orgNama || 'TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA';
  const background = template?.background;
  const levelText = (LEVEL_LABELS[melatiLevel] ?? LEVEL_LABELS[1]) as string;
  const yearsText = (LEVEL_YEARS[melatiLevel] ?? LEVEL_YEARS[1]) as string;
  const bodyText = template?.body
    ? fillTemplateText(template.body, { nama: recipientName, tingkat: String(melatiLevel), ranting, distrik: districtName })
    : undefined;
  const signerSectionChildren = (signers || []).map((s, i) => h(View, { key: `signer-${i}`, style: styles.signerBlock }, s.signerName ? h(Text, { style: { fontSize: 13, fontWeight: 'bold', color: BLUE_950 } }, s.signerName) : null, s.signerTitle ? h(Text, { style: { fontSize: 11, color: '#64748b', marginTop: 2 } }, s.signerTitle) : null));

  return h(Document, null,
    h(Page, { size: [1188, 840], style: styles.page, key: 'front' },
      background ? h(Image, { key: 'bg', src: background, style: styles.backgroundImage }) : null,
      h(View, { style: styles.headerSection },
        h(View, { style: styles.logoCircle }, h(Text, { style: styles.logoInner }, 'THS')),
        h(Text, { style: styles.orgName }, orgNama),
        h(Text, { style: styles.districtName }, districtName)),
      h(View, { style: styles.titleSection },
        h(Text, { style: styles.piagamText }, 'PIAGAM MELATI'),
        h(Text, { style: styles.melatiText }, levelText),
        h(Text, { style: styles.nomorText }, `Nomor: ${awardNumber}`)),
      h(View, { style: styles.bodySection },
        h(Text, { style: styles.gloriaText }, 'Gloria.'),
        bodyText
          ? h(Text, { style: styles.ketText }, bodyText)
          : h(View, null,
              h(Text, { style: styles.ketText }, yearsText),
              h(Text, { style: styles.diberikanText }, 'Terikat tali persaudaraan sejati Keluarga Besar THS-THM, kami persembahkan penghargaan melati lambang kesetiaan ini pada sahabat kami:'),
              h(View, { style: styles.namaBox }, h(Text, { style: styles.namaText }, recipientName)),
              h(Text, { style: styles.ketText }, `Ranting ${ranting} - ${districtName}.`),
              h(Text, { style: styles.ketText }, 'Semoga kesetiaan pada Keluarga Besar ini semakin meningkatkan pengabdian pada tugas pelayanan menjadi garam dan terang dunia. Deo Gratias.'))),
      h(View, { style: styles.signerSection }, ...signerSectionChildren),
      h(Text, { style: styles.tanggalText, position: 'absolute' as const, right: 80, bottom: 60 }, issuedDate)));
}

