/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Builder PDF Piagam Penghargaan Seroja - A4 landscape (1188x840 px).
 * Mengikuti Pedoman Administrasi Kesekretariatan THS-THM No 3 Tahun 2004,
 * Bagian VI.3: Piagam Penghargaan Seroja.
 * Makna: Bunga Seroja adalah lambang perjuangan.
 * Penerima: Anggota aktif Panitia Kegiatan tingkat Distrik/Keuskupan/Nasional.
 * Penerbit: Koordinatorat Distrik/Komisariat.
 * Penandatangan: Koordinator Distrik/Komisariat + Pastor Moderator.
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
  headerSection: { position: 'absolute', top: 50, left: 70, right: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: YELLOW_400, borderWidth: 5, borderColor: BLUE_900, alignItems: 'center', justifyContent: 'center' },
  logoInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: WHITE, borderWidth: 1, borderColor: BLUE_900, alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 'bold', color: BLUE_900 },
  orgName: { fontSize: 22, fontWeight: 'black', color: BLUE_950, textAlign: 'center', letterSpacing: 1 },
  districtName: { fontSize: 16, fontWeight: 'bold', color: BLUE_900, textAlign: 'center', marginTop: 4 },
  titleSection: { position: 'absolute', top: 190, left: 0, right: 0, textAlign: 'center' },
  piagamText: { fontSize: 48, fontWeight: 'black', color: BLUE_950, letterSpacing: 3 },
  serojaText: { fontSize: 30, fontWeight: 'black', color: YELLOW_400, letterSpacing: 5, marginTop: 4 },
  nomorText: { fontSize: 14, color: '#64748b', marginTop: 10 },
  bodySection: { position: 'absolute', top: 350, left: 80, right: 80, textAlign: 'center' },
  diberikanText: { fontSize: 18, color: '#475569', marginBottom: 12 },
  namaBox: { paddingHorizontal: 50, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, alignSelf: 'center' },
  namaText: { fontSize: 36, fontWeight: 'black', color: BLUE_950, letterSpacing: 1 },
  ketText: { fontSize: 18, color: '#475569', marginTop: 18, lineHeight: 1.6 },
  signerSection: { position: 'absolute', left: 70, right: 70, bottom: 80, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  signerBlock: { width: 330, alignItems: 'center' },
  tanggalText: { fontSize: 13, color: '#64748b', textAlign: 'right' },
});

interface PiagamSerojaProps {
  recipientName: string;
  awardNumber: string;
  activityDetail: string;
  issuedDate: string;
  ranting: string;
  districtName: string;
  signers: Array<{ signerName: string; signerTitle: string }>;
  qrDataUrl?: string;
  template?: { orgNama?: string; orgAlamat?: string; judul?: string; body?: string; background?: string };
}

const h = React.createElement;

export function buildPiagamSerojaPdf(props: PiagamSerojaProps) {
  const { recipientName, awardNumber, activityDetail, issuedDate, ranting, districtName, signers, qrDataUrl, template } = props;
  const orgNama = template?.orgNama || 'TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA';
  const background = template?.background;
  const bodyText = template?.body
    ? fillTemplateText(template.body, { nama: recipientName, kegiatan: activityDetail, ranting, distrik: districtName })
    : undefined;
  const signerSectionChildren = (signers || []).map((s, i) => h(View, { key: `signer-${i}`, style: styles.signerBlock }, s.signerName ? h(Text, { style: { fontSize: 14, fontWeight: 'bold', color: BLUE_950 } }, s.signerName) : null, s.signerTitle ? h(Text, { style: { fontSize: 12, color: '#64748b', marginTop: 2 } }, s.signerTitle) : null));

  return h(Document, null,
    h(Page, { size: [1188, 840], style: styles.page, key: 'front' },
      background ? h(Image, { key: 'bg', src: background, style: styles.backgroundImage }) : null,
      h(View, { style: styles.headerSection },
        h(View, { style: styles.logoCircle }, h(Text, { style: styles.logoInner }, 'THS')),
        h(Text, { style: styles.orgName }, orgNama),
        h(Text, { style: styles.districtName }, districtName)),
      h(View, { style: styles.titleSection },
        h(Text, { style: styles.piagamText }, 'PIAGAM PENGHARGAAN'),
        h(Text, { style: styles.serojaText }, 'SEROJA - LAMBANG PERJUANGAN'),
        h(Text, { style: styles.nomorText }, `Nomor: ${awardNumber}`)),
      h(View, { style: styles.bodySection },
        h(Text, { style: styles.diberikanText }, 'Diberikan dengan bangga kepada'),
        h(View, { style: styles.namaBox }, h(Text, { style: styles.namaText }, recipientName)),
        bodyText
          ? h(Text, { style: { fontSize: 16, color: '#475569', marginTop: 18, lineHeight: 1.6 } }, bodyText)
          : h(Text, { style: styles.ketText }, `Atas dedikasi dan perjuangannya sebagai ${activityDetail}, Ranting ${ranting}. Semoga penghargaan ini menjadi penyemangat untuk terus berjuang demi kejayaan Keluarga Besar THS-THM.`)),
      h(View, { style: styles.signerSection }, ...signerSectionChildren),
      h(Text, { style: styles.tanggalText, position: 'absolute' as const, right: 80, bottom: 70 }, issuedDate)));
}

