/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Builder PDF Piagam Penghargaan (Prestasi) — A4 landscape.
 * Mengikuti contoh desain di
 * `packages/templates/awards/piagam_prestasi_a_4_landscape_template.jsx`
 * (297×210mm → 1188×840 px).
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
  /** Gambar latar (background) — menutupi seluruh halaman, di bawah konten. */
  backgroundImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 1188,
    height: 840,
    objectFit: 'fill',
  },
  innerBorder1: {
    position: 'absolute',
    left: 34,
    top: 34,
    right: 34,
    bottom: 34,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: YELLOW_400,
  },
  innerBorder2: {
    position: 'absolute',
    left: 48,
    top: 48,
    right: 48,
    bottom: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(30,58,95,0.25)',
  },
  watermark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.045,
  },
  watermarkCircle: {
    width: 380,
    height: 380,
    borderRadius: 190,
    borderWidth: 25,
    borderColor: BLUE_900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermarkText: {
    fontSize: 80,
    fontWeight: 'black',
    color: BLUE_900,
  },
  headerSection: {
    position: 'absolute',
    top: 55,
    left: 70,
    right: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: YELLOW_400,
    borderWidth: 5,
    borderColor: BLUE_900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BLUE_900,
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: BLUE_900,
  },
  orgName: {
    fontSize: 26,
    fontWeight: 'black',
    color: BLUE_950,
    textAlign: 'center',
    letterSpacing: 1,
  },
  titleSection: {
    position: 'absolute',
    top: 170,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 56,
    fontWeight: 'black',
    color: BLUE_950,
    letterSpacing: 2,
  },
  nomorText: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 12,
  },
  bodySection: {
    position: 'absolute',
    top: 300,
    left: 90,
    right: 90,
    alignItems: 'center',
  },
  diberikanText: {
    fontSize: 20,
    color: '#475569',
    marginBottom: 16,
  },
  namaBox: {
    paddingHorizontal: 50,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: YELLOW_400,
  },
  namaText: {
    fontSize: 40,
    fontWeight: 'black',
    color: BLUE_950,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sebagaiText: {
    fontSize: 24,
    color: BLUE_900,
    marginTop: 18,
    fontWeight: 'black',
  },
  /** Body/isi dari pengaturan (Template Dokumen → Isi Dokumen). */
  bodyTemplateText: {
    fontSize: 16,
    color: '#475569',
    marginTop: 20,
    lineHeight: 1.6,
    textAlign: 'center',
  },
  keteranganText: {
    fontSize: 20,
    color: '#475569',
    marginTop: 20,
    lineHeight: 1.6,
    textAlign: 'center',
  },
  signerSection: {
    position: 'absolute',
    left: 90,
    right: 90,
    bottom: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  signerBlock: {
    width: 250,
    alignItems: 'center',
    position: 'relative',
  },
  signatureImage: {
    height: 48,
    marginBottom: 4,
    objectFit: 'contain',
  },
  stampImage: {
    position: 'absolute',
    top: -15,
    right: -25,
    width: 75,
    height: 75,
    opacity: 0.85,
    objectFit: 'contain',
  },
  signerLine: {
    borderTopWidth: 1,
    borderTopColor: '#64748b',
    paddingTop: 6,
    width: '100%',
    alignItems: 'center',
  },
  signerName: {
    fontSize: 15,
    fontWeight: 'black',
    color: BLUE_950,
  },
  signerTitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 'semibold',
  },
  tanggalText: {
    fontSize: 16,
    fontWeight: 'semibold',
    color: '#475569',
    paddingBottom: 12,
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
  /** Judul/kategori penghargaan, mis. "Peserta Terbaik". */
  predicate?: string;
  /** Nama kegiatan/deskripsi penghargaan. */
  description?: string;
  location?: string;
  issuedDate: string;
  /** Penandatangan (1-3 orang) dengan opsional signatureUrl & stampUrl. */
  signers: Array<{
    signerName: string;
    signerTitle: string;
    signatureUrl?: string;
    stampUrl?: string;
  }>;
  qrDataUrl?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  /** Override teks template dari pengaturan (halaman Settings → Template Dokumen). */
  template?: {
    orgNama?: string;
    judul?: string;
    /** Body/isi dokumen dengan placeholder {{nama}}, {{kegiatan}}, dst. */
    body?: string;
    /** Path absolut gambar latar — dirender sebagai background halaman. */
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
    watermarkText,
    watermarkOpacity,
    template,
  } = props;

  const orgName = template?.orgNama || 'TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA';
  const judulText = template?.judul || 'PIAGAM PENGHARGAAN';
  const watermarkLabel = watermarkText || 'THS';
  const watermarkAlpha = watermarkOpacity ?? 0.045;
  // Body/isi dari pengaturan — menggantikan keterangan bawaan bila diisi.
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
        ? h(Image, { src: s.signatureUrl, style: styles.signatureImage })
        : h(Text, { style: { fontSize: 13, color: '#475569', marginBottom: 4 } }, 'ttd'),
      s.stampUrl ? h(Image, { src: s.stampUrl, style: styles.stampImage }) : null,
      h(
        View,
        { style: styles.signerLine },
        h(Text, { style: styles.signerName }, s.signerName),
        h(Text, { style: styles.signerTitle }, s.signerTitle),
      ),
    ),
  );

  const signerCount = signerBlocks.length;
  // Untuk 2 penandatangan, tanggal berada di tengah; selain itu tanggal di kanan.
  const signerSectionChildren =
    signerCount === 2
      ? [
          signerBlocks[0],
          h(Text, { key: 'tgl', style: styles.tanggalText }, issuedDate),
          signerBlocks[1],
        ]
      : signerCount === 1
        ? [signerBlocks[0], h(Text, { key: 'tgl', style: styles.tanggalText }, issuedDate)]
        : signerBlocks;

  return h(
    Document,
    null,
    h(
      Page,
      { size: [1188, 840], style: styles.page, key: 'award' },
      // Latar (background) opsional dari pengaturan Template Dokumen
      background ? h(Image, { key: 'bg', src: background, style: styles.backgroundImage }) : null,
      h(
        View,
        { style: { ...styles.watermark, opacity: watermarkAlpha } },
        h(
          View,
          { style: styles.watermarkCircle },
          h(Text, { style: styles.watermarkText }, watermarkLabel),
        ),
      ),
      h(View, { style: styles.innerBorder1 }),
      h(View, { style: styles.innerBorder2 }),
      // Header: logo — nama organisasi — logo
      h(
        View,
        { style: styles.headerSection },
        h(
          View,
          { style: styles.logoCircle },
          h(View, { style: styles.logoInner }, h(Text, null, 'THS')),
        ),
        h(
          View,
          { style: { flex: 1, alignItems: 'center' } },
          h(Text, { style: styles.orgName }, orgName),
        ),
        h(
          View,
          { style: styles.logoCircle },
          h(View, { style: styles.logoInner }, h(Text, null, 'THS')),
        ),
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
          : description
            ? h(Text, { style: styles.keteranganText }, description)
            : null,
      ),
      // Penandatangan (1-3 blok)
      h(View, { style: styles.signerSection }, ...signerSectionChildren),
      qrDataUrl ? h(Image, { key: 'qr', src: qrDataUrl, style: styles.qrImage }) : null,
    ),
  );
}

