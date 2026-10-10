/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Builder PDF Piagam Penghargaan Mawar - A4 landscape (1188x840 px).
 * Mengikuti Pedoman Administrasi Kesekretariatan THS-THM No 3 Tahun 2004,
 * Bagian VI.5: Piagam Penghargaan Mawar.
 * Makna: Bunga Mawar adalah lambang kesucian dan kemuliaan.
 * Penerima: Anggota/Simpatisan/pihak lain berjasa besar regional/nasional.
 * Diberikan tiap 5 tahun saat Sidang Nasional.
 * Penerbit: Dewan Pendiri. Penandatangan: Dewan Pendiri + Koordinator Nasional + Pastor Moderator Nasional.
 */
const React = require('react');
const { Document, Page, View, Text, Image, StyleSheet } = require('@react-pdf/renderer');
import { fillTemplateText } from './template-text';

const BLUE_900 = '#1e3a5f';
const BLUE_950 = '#0f1f3a';
const YELLOW_400 = '#facc15';
const WHITE = '#ffffff';

const styles = StyleSheet.create({
  page: { width: 1188, height: 840, padding: 0, backgroundColor: WHITE, position: 'relative', fontFamily: 'Times-Roman' },
  backgroundImage: { position: 'absolute', left: 0, top: 0, width: 1188, height: 840, objectFit: 'fill' },
  headerSection: { position: 'absolute', top: 46, left: 70, right: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: YELLOW_400, borderWidth: 5, borderColor: BLUE_900, alignItems: 'center', justifyContent: 'center' },
  logoInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: WHITE, borderWidth: 1, borderColor: BLUE_900, alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold', color: BLUE_900 },
  orgName: { fontSize: 20, fontWeight: 'black', color: BLUE_950, textAlign: 'center', letterSpacing: 1 },
  districtName: { fontSize: 15, fontWeight: 'bold', color: BLUE_900, textAlign: 'center', marginTop: 3 },
  titleSection: { position: 'absolute', top: 158, left: 0, right: 0, textAlign: 'center' },
  piagamText: { fontSize: 42, fontWeight: 'black', color: BLUE_950, letterSpacing: 3 },
  mawarText: { fontSize: 18, fontWeight: 'black', color: YELLOW_400, letterSpacing: 2, marginTop: 4 },
  quoteText: { fontSize: 13, fontStyle: 'italic', color: '#64748b', marginTop: 6 },
  nomorText: { fontSize: 13, color: '#64748b', marginTop: 8 },
  bodySection: { position: 'absolute', top: 316, left: 70, right: 70, textAlign: 'center' },
  gloriaText: { fontSize: 15, fontWeight: 'bold', color: BLUE_900, marginBottom: 6 },
  diberikanText: { fontSize: 15, color: '#475569', marginBottom: 8 },
  namaBox: { paddingHorizontal: 46, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, alignSelf: 'center' },
  namaText: { fontSize: 30, fontWeight: 'black', color: BLUE_950, letterSpacing: 1 },
  ketText: { fontSize: 15, color: '#475569', marginTop: 12, lineHeight: 1.6 },
  signerSection: { position: 'absolute', left: 70, right: 70, bottom: 64, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  signerBlock: { width: 300, alignItems: 'center' },
  tanggalText: { fontSize: 12, color: '#64748b', textAlign: 'right' },
});

interface PiagamMawarProps {
  recipientName: string;
  awardNumber: string;
  contributionDetail: string;
  issuedDate: string;
  ranting: string;
  districtName: string;
  signers: Array<{ signerName: string; signerTitle: string }>;
  qrDataUrl?: string;
  template?: { orgNama?: string; orgAlamat?: string; judul?: string; body?: string; background?: string };
}

const h = React.createElement;

export function buildPiagamMawarPdf(props: PiagamMawarProps) {
  const { recipientName, awardNumber, contributionDetail, issuedDate, ranting, districtName, signers, qrDataUrl, template } = props;
  const orgNama = template?.orgNama || 'KELUARGA BESAR TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA';
  const background = template?.background;
  const bodyText = template?.body
    ? fillTemplateText(template.body, { nama: recipientName, jasa: contributionDetail, ranting, distrik: districtName })
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
        h(Text, { style: styles.piagamText }, 'PENGHARGAAN MAWAR'),
        h(Text, { style: styles.mawarText }, 'LAMBANG KESUCIAN DAN KEMULIAAN'),
        h(Text, { style: styles.quoteText }, '"Kurangkai mawar yang harum semerbak, lambang kasihku padamu, Bunda. Ave Maria!"'),
        h(Text, { style: styles.nomorText }, `Nomor: ${awardNumber}`)),
      h(View, { style: styles.bodySection },
        h(Text, { style: styles.gloriaText }, 'Gloria. Berdasarkan Keputusan Bersama Dewan Pendiri dan Koordinatorat Nasional,'),
        bodyText
          ? h(Text, { style: styles.ketText }, bodyText)
          : h(View, null,
              h(Text, { style: styles.diberikanText }, 'dengan penuh kebanggaan kami memberikan Penghargaan kepada'),
              h(View, { style: styles.namaBox }, h(Text, { style: styles.namaText }, recipientName)),
              h(Text, { style: styles.ketText }, `Atas ${contributionDetail} dalam ikatan Keluarga Besar THS-THM. Ranting ${ranting} - ${districtName}.`),
              h(Text, { style: styles.ketText }, 'Semoga Penghargaan ini mampu mewujudkan cinta kasih Bunda Maria yang suci-mulia seperti semerbaknya mawar menyambut sang fajar. Deo Gratias.'))),
      h(View, { style: styles.signerSection }, ...signerSectionChildren),
      h(Text, { style: styles.tanggalText, position: 'absolute' as const, right: 80, bottom: 54 }, issuedDate)));
}

