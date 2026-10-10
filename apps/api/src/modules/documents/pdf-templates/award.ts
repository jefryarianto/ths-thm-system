/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Builder PDF Piagam Penghargaan (Prestasi) — A4 landscape.
 * Mengikuti desain repo
 * `packages/templates/awards/piagam_prestasi_a_4_landscape_template.jsx`
 * (297×210mm -> 1188×840 px): logo tunggal kiri-atas, judul tengah, detail
 * Kegiatan/Lokasi/Waktu, baris tanda tangan (Koordinator | CAP | Team Leader).
 */
const React = require('react');
const { Document, Page, View, Text, Image, StyleSheet } = require('@react-pdf/renderer');
import { fillTemplateText } from './template-text';

const BLUE_900 = '#1e3a5f';
const BLUE_950 = '#0f1f3a';
const YELLOW_400 = '#facc15';
const WHITE = '#ffffff';

const styles = StyleSheet.create({
  page: {
    width: 1188,
    height: 840,
    padding: 0,
    backgroundColor: WHITE,
    position: 'relative',
    fontFamily: 'Times-Roman',
  },
  /** Gambar latar (background) opsional — menutupi seluruh halaman, di bawah konten. */
  backgroundImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 1188,
    height: 840,
    objectFit: 'fill',
  },
  logoWrap: {
    position: 'absolute',
    left: 72,
    top: 60,
    alignItems: 'center',
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: YELLOW_400,
    borderWidth: 7,
    borderColor: BLUE_900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: BLUE_900,
  },
  titleSection: {
    position: 'absolute',
    top: 150,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 54,
    fontWeight: 'bold',
    color: BLUE_950,
    letterSpacing: 2,
  },
  nomorText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 10,
  },
  bodySection: {
    position: 'absolute',
    top: 270,
    left: 90,
    right: 90,
    alignItems: 'center',
  },
  diberikanText: {
    fontSize: 20,
    color: '#475569',
    marginBottom: 14,
  },
  namaBox: {
    paddingHorizontal: 50,
    paddingVertical: 10,
    borderBottomWidth: 3,
    borderBottomColor: YELLOW_400,
  },
  namaText: {
    fontSize: 38,
    fontWeight: 'bold',
    color: BLUE_950,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sebagaiText: {
    fontSize: 22,
    color: BLUE_900,
    marginTop: 16,
    fontWeight: 'bold',
  },
  detailBox: {
    marginTop: 24,
    alignItems: 'center',
  },
  detailText: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 1.6,
  },
  bodyTemplateText: {
    fontSize: 16,
    color: '#475569',
    marginTop: 24,
    lineHeight: 1.6,
    textAlign: 'center',
  },
  signerSection: {
    position: 'absolute',
    left: 70,
    right: 70,
    bottom: 80,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  signerBlock: {
    width: 260,
    alignItems: 'center',
  },
  sigImage: {
    width: 200,
    height: 64,
    objectFit: 'contain',
    marginBottom: 4,
  },
  ttdPlaceholder: {
    width: 200,
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  ttdPlaceholderText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  capImage: {
    width: 110,
    height: 110,
    objectFit: 'contain',
    opacity: 0.9,
    marginBottom: 4,
  },
  signerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: BLUE_950,
    textAlign: 'center',
  },
  signerTitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  qrImage: {
    position: 'absolute',
    right: 60,
    bottom: 60,
    width: 90,
    height: 90,
  },
});

interface AwardPdfProps {
  recipientName: string;
  awardNumber: string;
  /** Predikat penghargaan, mis. "Peserta Terbaik". */
  predicate?: string;
  /** Nama kegiatan. */
  description?: string;
  /** Lokasi kegiatan. */
  location?: string;
  /** Waktu/tanggal kegiatan & tanda tangan. */
  issuedDate: string;
  /** Penandatangan (dinamis) dengan opsional signatureUrl & stampUrl (cap). */
  signers: Array<{
    signerName: string;
    signerTitle: string;
    signatureUrl?: string;
    stampUrl?: string;
  }>;
  qrDataUrl?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  /** Override teks template dari pengaturan (Settings -> Template Dokumen). */
  template?: {
    orgNama?: string;
    judul?: string;
    body?: string;
    background?: string;
  };
}

const h = React.createElement;

export function buildAwardPdf(props: AwardPdfProps) {
  const {
    recipientName,
    awardNumber,
    predicate,
    description,
    location,
    issuedDate,
    signers,
    qrDataUrl,
    template,
  } = props;

  const judulText = template?.judul || 'PIAGAM PENGHARGAAN';
  const bodyText = template?.body
    ? fillTemplateText(template.body, {
        nama: recipientName,
        nomor: awardNumber,
        kegiatan: description,
        lokasi: location,
        predikat: predicate,
        tanggal: issuedDate,
      })
    : undefined;
  const background = template?.background;

  const signerBlocks = (signers || []).map((s, i) =>
    h(
      View,
      { key: `signer-${i}`, style: styles.signerBlock },
      s.signatureUrl
        ? h(Image, { src: s.signatureUrl, style: styles.sigImage })
        : h(
            View,
            { style: styles.ttdPlaceholder },
            h(Text, { style: styles.ttdPlaceholderText }, 'Tanda Tangan'),
          ),
      h(Text, { style: styles.signerName }, s.signerName),
      h(Text, { style: styles.signerTitle }, s.signerTitle),
    ),
  );

  // Cap/stempel dirender terpisah (seperti blok "CAP" di tengah pada desain repo).
  const capBlocks = (signers || [])
    .filter((s) => s.stampUrl)
    .map((s, i) => h(Image, { key: `cap-${i}`, src: s.stampUrl, style: styles.capImage }));

  return h(
    Document,
    null,
    h(
      Page,
      { size: [1188, 840], style: styles.page, key: 'award' },
      // Latar (background) opsional dari pengaturan Template Dokumen
      background ? h(Image, { key: 'bg', src: background, style: styles.backgroundImage }) : null,
      // Logo tunggal kiri-atas
      h(
        View,
        { style: styles.logoWrap },
        h(View, { style: styles.logoCircle }, h(Text, { style: styles.logoText }, 'THS')),
      ),
      // Judul
      h(
        View,
        { style: styles.titleSection },
        h(Text, { style: styles.titleText }, judulText),
        h(Text, { style: styles.nomorText }, `Nomor: ${awardNumber}`),
      ),
      // Isi
      h(
        View,
        { style: styles.bodySection },
        h(Text, { style: styles.diberikanText }, 'Diberikan Kepada'),
        h(View, { style: styles.namaBox }, h(Text, { style: styles.namaText }, recipientName)),
        predicate ? h(Text, { style: styles.sebagaiText }, `Sebagai ${predicate}`) : null,
        bodyText
          ? h(Text, { style: styles.bodyTemplateText }, bodyText)
          : h(
              View,
              { style: styles.detailBox },
              description
                ? h(Text, { style: styles.detailText }, `Kegiatan: ${description}`)
                : null,
              location ? h(Text, { style: styles.detailText }, `Lokasi: ${location}`) : null,
              h(Text, { style: styles.detailText }, `Waktu: ${issuedDate}`),
            ),
      ),
      // Baris tanda tangan: Koordinator | CAP | Team Leader
      h(View, { style: styles.signerSection }, ...signerBlocks, ...capBlocks),
      qrDataUrl ? h(Image, { key: 'qr', src: qrDataUrl, style: styles.qrImage }) : null,
    ),
  );
}
