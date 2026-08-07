/* eslint-disable @typescript-eslint/no-require-imports */
const React = require('react');
const { Document, Page, View, Text, Image, StyleSheet } = require('@react-pdf/renderer');

const BLUE_900 = '#1e3a5f';
const BLUE_950 = '#0f1f3a';
const YELLOW_400 = '#facc15';
const YELLOW_600 = '#ca8a04';
const WHITE = '#ffffff';

const styles = StyleSheet.create({
  page: {
    width: 1188,
    height: 840,
    padding: 0,
    backgroundColor: WHITE,
    position: 'relative',
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
  headerSection: {
    position: 'absolute',
    top: 50,
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
  districtName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BLUE_900,
    textAlign: 'center',
    marginTop: 4,
  },
  titleSection: {
    position: 'absolute',
    top: 165,
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  sertifikatText: {
    fontSize: 55,
    fontWeight: 'black',
    color: BLUE_950,
    letterSpacing: 3,
  },
  pendadaranText: {
    fontSize: 30,
    fontWeight: 'black',
    color: YELLOW_600,
    letterSpacing: 5,
    marginTop: 4,
  },
  nomorText: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 12,
  },
  bodySection: {
    position: 'absolute',
    top: 320,
    left: 80,
    right: 80,
    textAlign: 'center',
  },
  diberikanText: {
    fontSize: 19,
    color: '#475569',
    marginBottom: 16,
  },
  namaBox: {
    paddingHorizontal: 50,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    alignSelf: 'center',
  },
  namaText: {
    fontSize: 42,
    fontWeight: 'black',
    color: BLUE_950,
    letterSpacing: 1,
  },
  keteranganLulus: {
    fontSize: 21,
    color: '#475569',
    marginTop: 24,
    lineHeight: 1.6,
  },
  infoGrid: {
    position: 'absolute',
    left: 80,
    right: 80,
    top: 530,
    flexDirection: 'row',
    gap: 12,
  },
  infoBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: 'black',
    color: BLUE_950,
    marginTop: 4,
  },
  infoValueHighlight: {
    fontSize: 24,
    fontWeight: 'black',
    color: BLUE_950,
    marginTop: 4,
  },
  signerSection: {
    position: 'absolute',
    left: 80,
    right: 80,
    bottom: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  signerBlock: {
    width: 250,
    alignItems: 'center',
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
  // Back side
  backTitle: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 34,
    fontWeight: 'black',
    color: BLUE_950,
    letterSpacing: 1,
  },
  backSubtitle: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 14,
    color: '#64748b',
  },
  aspectsGrid: {
    position: 'absolute',
    top: 130,
    left: 70,
    right: 70,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  aspectCard: {
    width: '46%',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
  },
  aspectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  aspectName: {
    fontSize: 16,
    fontWeight: 'black',
    color: BLUE_950,
  },
  aspectScore: {
    fontSize: 12,
    fontWeight: 'bold',
    color: WHITE,
    backgroundColor: BLUE_900,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  aspectItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  aspectItem: {
    fontSize: 11,
    color: '#475569',
    width: '48%',
  },
  summaryBar: {
    position: 'absolute',
    left: 70,
    right: 70,
    bottom: 60,
    backgroundColor: BLUE_900,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    color: WHITE,
    fontSize: 13,
    opacity: 0.9,
  },
  summaryScore: {
    color: WHITE,
    fontSize: 22,
    fontWeight: 'black',
  },
});

interface AspectScore {
  name: string;
  score: string | number;
  items: string[];
}

interface CertificatePdfProps {
  recipientName: string;
  certificateNumber: string;
  eventTitle: string;
  location: string;
  ranting: string;
  wilayah: string;
  distrik: string;
  finalScore: string | number;
  predicate: string;
  status: string;
  issuedDate: string;
  /** Penandatangan sertifikat (1-3 orang). */
  signers: Array<{ signerName: string; signerTitle: string }>;
  aspects: AspectScore[];
  qrDataUrl?: string;
  hideBack?: boolean;
  /** Override teks template dari pengaturan (halaman Settings → Template Dokumen). */
  template?: {
    orgNama?: string;
    judul?: string;
    subJudul?: string;
  };
}

const h = React.createElement;

export function buildCertificatePdf(props: CertificatePdfProps) {
  const {
    recipientName, certificateNumber, eventTitle, location,
    ranting, wilayah, distrik, finalScore, predicate, status,
    issuedDate, signers, aspects, qrDataUrl, template,
  } = props;

  const orgName = template?.orgNama || 'TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA';
  const judulText = template?.judul || 'SERTIFIKAT';
  const subJudulText = template?.subJudul || 'PENDADARAN';

  const signerBlocks = (signers || []).map((s, i) =>
    h(View, { key: `signer-${i}`, style: styles.signerBlock },
      h(Text, { style: { fontSize: 13, color: '#475569', marginBottom: 4 } }, 'ttd'),
      h(View, { style: styles.signerLine },
        h(Text, { style: styles.signerName }, s.signerName),
        h(Text, { style: styles.signerTitle }, s.signerTitle))),
  );

  // Tanggal di tengah untuk 2 penandatangan (mempertahankan tata letak klasik);
  // untuk 1 atau 3 penandatangan, tanggal diposisikan absolut di atas baris.
  const signerCount = signerBlocks.length;
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

  const pages = [
    // Front side
    h(Page, { size: [1188, 840], style: styles.page, key: 'front' },
      h(View, { style: styles.watermark },
        h(View, { style: styles.watermarkCircle },
          h(Text, { style: styles.watermarkText }, 'THS'))),
      h(View, { style: styles.innerBorder1 }),
      h(View, { style: styles.innerBorder2 }),
      // Header
      h(View, { style: styles.headerSection },
        h(View, { style: styles.logoCircle },
          h(View, { style: styles.logoInner }, h(Text, null, 'THS'))),
        h(View, { style: { flex: 1, alignItems: 'center' } },
          h(Text, { style: styles.orgName }, orgName),
          h(Text, { style: styles.districtName }, `KOORDINATORAT DISTRIK ${distrik.toUpperCase()}`)),
        h(View, { style: styles.logoCircle },
          h(View, { style: styles.logoInner }, h(Text, null, 'THS')))),
      // Title
      h(View, { style: styles.titleSection },
        h(Text, { style: styles.sertifikatText }, judulText),
        h(Text, { style: styles.pendadaranText }, subJudulText),
        h(Text, { style: styles.nomorText }, `Nomor Sertifikat: ${certificateNumber}`)),
      // Body
      h(View, { style: styles.bodySection },
        h(Text, { style: styles.diberikanText }, 'Diberikan kepada'),
        h(View, { style: styles.namaBox },
          h(Text, { style: styles.namaText }, recipientName)),
        h(Text, { style: styles.keteranganLulus },
          `atas kelulusan dalam kegiatan ${eventTitle} di ${location}`)),
      // Info Grid
      h(View, { style: styles.infoGrid },
        h(View, { style: styles.infoBox },
          h(Text, { style: styles.infoLabel }, 'Ranting'),
          h(Text, { style: styles.infoValue }, ranting)),
        h(View, { style: styles.infoBox },
          h(Text, { style: styles.infoLabel }, 'Wilayah'),
          h(Text, { style: styles.infoValue }, wilayah)),
        h(View, { style: styles.infoBox },
          h(Text, { style: styles.infoLabel }, 'Distrik'),
          h(Text, { style: styles.infoValue }, distrik))),
      // Score Grid
      h(View, { style: { position: 'absolute', left: 80, right: 80, top: 630, flexDirection: 'row', gap: 12 } },
        h(View, { style: styles.infoBox },
          h(Text, { style: styles.infoLabel }, 'Nilai Akhir'),
          h(Text, { style: styles.infoValueHighlight }, String(finalScore))),
        h(View, { style: styles.infoBox },
          h(Text, { style: styles.infoLabel }, 'Predikat'),
          h(Text, { style: styles.infoValueHighlight }, predicate)),
        h(View, { style: styles.infoBox },
          h(Text, { style: styles.infoLabel }, 'Status'),
          h(Text, { style: styles.infoValueHighlight }, status))),
      // Penandatangan (1-3 blok)
      h(View, { style: styles.signerSection }, ...signerSectionChildren),
      ...(signerCount !== 2 && signerCount > 0
        ? [
            h(Text, {
              key: 'tgl-abs',
              style: { ...styles.tanggalText, position: 'absolute' as const, right: 80, bottom: 150 },
            }, issuedDate),
          ]
        : []),
    ),
    // Back side
    h(Page, { size: [1188, 840], style: styles.page, key: 'back' },
      h(View, { style: styles.watermark },
        h(View, { style: styles.watermarkCircle },
          h(Text, { style: styles.watermarkText }, 'THS'))),
      h(View, { style: styles.innerBorder1 }),
      h(View, { style: styles.innerBorder2 }),
      h(Text, { style: styles.backTitle }, 'RINCIAN PENILAIAN PENDADARAN'),
      h(Text, { style: styles.backSubtitle }, 'Nilai item 55-90, nilai aspek dihitung dari rata-rata item'),
      // Aspects
      h(View, { style: styles.aspectsGrid },
        aspects.map((aspect, i) =>
          h(View, { style: styles.aspectCard, key: i },
            h(View, { style: styles.aspectHeader },
              h(Text, { style: styles.aspectName }, aspect.name),
              h(Text, { style: styles.aspectScore }, `Nilai: ${aspect.score}`)),
            h(View, { style: styles.aspectItems },
              aspect.items.map((item, j) =>
                h(Text, { style: styles.aspectItem, key: j }, `• ${item}`))
            )
          )
        )
      ),
      // Summary
      h(View, { style: styles.summaryBar },
        h(View, null,
          h(Text, { style: styles.summaryText }, 'Ringkasan Hasil'),
          h(Text, { style: styles.summaryScore },
            `Nilai Akhir ${finalScore} · ${predicate} · ${status}`),
          h(Text, { style: { color: WHITE, fontSize: 11, opacity: 0.8, marginTop: 4 } },
            'Predikat: 55-65 Cukup, 66-75 Baik, 76-90 Baik Sekali')),
        qrDataUrl
          ? h(Image, { src: qrDataUrl, style: { width: 70, height: 70 } })
          : null),
    ),
  ];

  return h(Document, null, pages);
}