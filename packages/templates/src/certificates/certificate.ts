/**
 * Builder PDF Sertifikat — A4 landscape (1188×840 px).
 * Mengikuti desain sertifikat pelatih/penguji/wasit/juri/tingkatan.
 */
import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { fillTemplateText } from '../components/template-text';

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
  titleText: {
    fontSize: 44,
    fontWeight: 'bold',
    color: BLUE_950,
    letterSpacing: 1.5,
  },
  subtitleText: {
    fontSize: 20,
    color: BLUE_900,
    marginTop: 8,
    fontWeight: 'bold',
  },
  recipientName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: BLUE_950,
    marginTop: 24,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bodySection: {
    position: 'absolute',
    top: 350,
    left: 100,
    right: 100,
    textAlign: 'center',
  },
  bodyText: {
    fontSize: 18,
    color: '#475569',
    lineHeight: 1.7,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
  },
  detailLabel: {
    fontSize: 16,
    color: '#64748b',
    marginRight: 8,
    fontWeight: 'bold',
  },
  detailValue: {
    fontSize: 16,
    color: BLUE_900,
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
  watermarkText: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
});

export interface CertificatePdfProps {
  /** Jenis sertifikat: 'pelatih' | 'penguji' | 'wasit' | 'juri' | 'tingkatan' */
  type: 'pelatih' | 'penguji' | 'wasit' | 'juri' | 'tingkatan';
  recipientName: string;
  certificateNumber: string;
  /** Nama kegiatan/acara sertifikasi. */
  eventName?: string;
  /** Lokasi. */
  location?: string;
  /** Tanggal diterbitkan. */
  issuedDate: string;
  /** Tanggal berlaku (optional). */
  validUntil?: string;
  /** Distrik/Wilayah penerbit. */
  districtName?: string;
  /** Organisasi (opsional). */
  orgName?: string;
  /** Penandatangan. */
  signers: Array<{
    signerName: string;
    signerTitle: string;
    signatureUrl?: string;
    stampUrl?: string;
  }>;
  /** QR code data URL untuk verifikasi. */
  qrDataUrl?: string;
  /** Watermark text (optional). */
  watermarkText?: string;
  watermarkOpacity?: number;
  /** Template override dari settings. */
  template?: {
    judul?: string;
    body?: string;
    background?: string;
  };
}

export function buildCertificatePdf(props: CertificatePdfProps) {
  const {
    type,
    recipientName,
    certificateNumber,
    eventName,
    location,
    issuedDate,
    validUntil,
    districtName,
    orgName,
    signers,
    qrDataUrl,
    watermarkText,
    template,
  } = props;

  const typeLabels: Record<string, { title: string; subtitle: string }> = {
    pelatih: { title: 'SERTIFIKAT PELATIH', subtitle: 'Pelatih Resmi THS-THM' },
    penguji: { title: 'SERTIFIKAT PENGUJI', subtitle: 'Penguji Resmi THS-THM' },
    wasit: { title: 'SERTIFIKAT WASIT', subtitle: 'Wasit Resmi THS-THM' },
    juri: { title: 'SERTIFIKAT JURI', subtitle: 'Juri Resmi THS-THM' },
    tingkatan: { title: 'SERTIFIKAT TINGKATAN', subtitle: 'Pencapaian Tingkatan THS-THM' },
  };

  const { title: defaultTitle, subtitle: defaultSubtitle } = typeLabels[type] || typeLabels.pelatih;
  const judulText = template?.judul || defaultTitle;
  const subtitleText = defaultSubtitle;

  const bodyText = template?.body
    ? fillTemplateText(template.body, {
        nama: recipientName,
        nomor: certificateNumber,
        kegiatan: eventName,
        lokasi: location,
        tanggal: issuedDate,
        tipe: defaultSubtitle,
      })
    : undefined;

  const background = template?.background;

  const signerBlocks = (signers || []).map((s, i) =>
    React.createElement(
      View,
      { key: `signer-${i}`, style: styles.signerBlock },
      s.signatureUrl
        ? React.createElement(Image, { src: s.signatureUrl, style: styles.sigImage })
        : React.createElement(
            View,
            { style: styles.ttdPlaceholder },
            React.createElement(Text, { style: styles.ttdPlaceholderText }, 'Tanda Tangan'),
          ),
      React.createElement(Text, { style: styles.signerName }, s.signerName),
      React.createElement(Text, { style: styles.signerTitle }, s.signerTitle),
    ),
  );

  const capBlocks = (signers || [])
    .filter((s) => s.stampUrl)
    .map((s, i) => React.createElement(Image, { key: `cap-${i}`, src: s.stampUrl, style: styles.capImage }));

  const watermark = watermarkText
    ? React.createElement(
        View,
        { style: { ...styles.watermarkText, opacity: watermarkText?.opacity || 0.05 } },
        React.createElement(Text, {
          style: { fontSize: 120, fontWeight: 'bold', color: BLUE_900, transform: [{ rotate: '-30deg' }] },
        }, watermarkText),
      )
    : null;

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: [1188, 840], style: styles.page, key: 'certificate' },
      background ? React.createElement(Image, { key: 'bg', src: background, style: styles.backgroundImage }) : null,
      React.createElement(View, { style: styles.innerBorder1 }),
      React.createElement(View, { style: styles.innerBorder2 }),
      watermark,
      // Header
      React.createElement(
        View,
        { style: styles.headerSection },
        React.createElement(
          View,
          { style: styles.logoCircle },
          React.createElement(View, { style: styles.logoInner }, React.createElement(Text, null, 'THS')),
        ),
        React.createElement(
          View,
          { style: { flex: 1, alignItems: 'center' } },
          React.createElement(Text, { style: styles.orgName }, orgName || 'THS-THM'),
          React.createElement(Text, { style: styles.districtName }, districtName || 'Distrik'),
        ),
        React.createElement(View, { style: styles.logoCircle }),
      ),
      // Title
      React.createElement(
        View,
        { style: styles.titleSection },
        React.createElement(Text, { style: styles.titleText }, judulText),
        React.createElement(Text, { style: styles.subtitleText }, subtitleText),
        React.createElement(Text, { style: styles.nomorText }, `Nomor: ${certificateNumber}`),
      ),
      // Recipient
      React.createElement(
        View,
        { style: { position: 'absolute', top: 270, left: 0, right: 0, alignItems: 'center' } },
        React.createElement(Text, { style: styles.recipientName }, recipientName),
      ),
      // Body
      React.createElement(
        View,
        { style: styles.bodySection },
        bodyText
          ? React.createElement(Text, { style: styles.bodyText }, bodyText)
          : React.createElement(
              View,
              null,
              eventName && React.createElement(
                View,
                { style: styles.detailRow },
                React.createElement(Text, { style: styles.detailLabel }, 'Kegiatan: '),
                React.createElement(Text, { style: styles.detailValue }, eventName),
              ),
              location && React.createElement(
                View,
                { style: styles.detailRow },
                React.createElement(Text, { style: styles.detailLabel }, 'Lokasi: '),
                React.createElement(Text, { style: styles.detailValue }, location),
              ),
              React.createElement(
                View,
                { style: styles.detailRow },
                React.createElement(Text, { style: styles.detailLabel }, 'Tanggal: '),
                React.createElement(Text, { style: styles.detailValue }, issuedDate),
              ),
              validUntil && React.createElement(
                View,
                { style: styles.detailRow },
                React.createElement(Text, { style: styles.detailLabel }, 'Berlaku s/d: '),
                React.createElement(Text, { style: styles.detailValue }, validUntil),
              ),
            ),
      ),
      // Signers
      React.createElement(View, { style: styles.signerSection }, ...signerBlocks, ...capBlocks),
      qrDataUrl ? React.createElement(Image, { key: 'qr', src: qrDataUrl, style: styles.qrImage }) : null,
    ),
  );
}