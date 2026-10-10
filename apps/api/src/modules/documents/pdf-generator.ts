/* eslint-disable @typescript-eslint/no-require-imports */
const React = require('react');
const { Document, Page, View, Text, Image, StyleSheet } = require('@react-pdf/renderer');
import { fillTemplateText } from './pdf-templates/template-text';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 12, fontFamily: 'Helvetica', position: 'relative' as const },
  /** Gambar latar (background) — menutupi seluruh halaman, di bawah konten. */
  backgroundImage: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    width: 595,
    height: 842,
    objectFit: 'fill' as const,
  },
  header: { marginBottom: 20, textAlign: 'center' as const },
  title: { fontSize: 18, fontWeight: 'bold' as const, marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 4, color: '#555' },
  /** Body/isi dokumen dari pengaturan (Template Dokumen → Isi Dokumen). */
  bodyBlock: { marginBottom: 16 },
  bodyText: { fontSize: 11, lineHeight: 1.7, color: '#334155', textAlign: 'center' as const },
  section: { marginBottom: 16 },
  label: { fontSize: 10, color: '#888', marginBottom: 2 },
  value: { fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 4 },
  qrContainer: { alignItems: 'center' as const, marginTop: 20 },
  qrImage: { width: 100, height: 100 },
  signerBlock: {
    alignItems: 'center' as const,
    minWidth: 160,
    position: 'relative' as const,
  },
  signatureImage: {
    height: 40,
    marginBottom: 4,
    objectFit: 'contain' as const,
  },
  stampImage: {
    position: 'absolute' as const,
    top: -10,
    right: -15,
    width: 60,
    height: 60,
    opacity: 0.8,
    objectFit: 'contain' as const,
  },
  watermark: {
    position: 'absolute' as const,
    top: 250,
    left: 0,
    right: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  watermarkText: {
    fontSize: 60,
    fontWeight: 'bold' as const,
    color: '#1e3a5f',
  },
  footer: {
    position: 'absolute' as const,
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center' as const,
    fontSize: 8,
    color: '#999',
  },
});

const docTypeLabels: Record<string, string> = {
  kartu_anggota: 'KARTU ANGGOTA',
  sertifikat_pendadaran: 'SERTIFIKAT PENDADARAN',
  sertifikat_pelatihan: 'SERTIFIKAT PELATIHAN',
  piagam_prestasi: 'PIAGAM PRESTASI',
};

interface PdfDocProps {
  type: string;
  nomorDokumen: string;
  member?: {
    namaLengkap: string;
    nomorAnggota: string;
    tingkat?: string | null;
    ranting?: { nama: string } | null;
  } | null;
  qrDataUrl: string;
  /** Penandatangan dokumen (1-3 orang, dari penugasan per tipe) dengan opsional signatureUrl & stampUrl. */
  signers?: Array<{
    signerName?: string;
    signerTitle?: string;
    signatureUrl?: string;
    stampUrl?: string;
  }>;
  stampUrl?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  /** Override teks template dari pengaturan (halaman Settings → Template Dokumen). */
  template?: {
    orgNama?: string;
    orgAlamat?: string;
    judul?: string;
    footer?: string;
    /** Body/isi dokumen dengan placeholder {{nama}}, {{nomor}}, dst. */
    body?: string;
    /** Path absolut gambar latar — dirender sebagai background halaman. */
    background?: string;
  };
}

const h = React.createElement;

export function buildPdfDocument({
  type,
  nomorDokumen,
  member,
  qrDataUrl,
  signers,
  stampUrl,
  watermarkText,
  watermarkOpacity,
  template,
}: PdfDocProps) {
  const orgNama = template?.orgNama || 'THS-THM System Manajemen';
  const orgAlamat = template?.orgAlamat;
  const judul = template?.judul || docTypeLabels[type] || 'DOKUMEN';
  const footer =
    template?.footer ||
    'Dokumen ini valid dan terverifikasi. Diterbitkan oleh THS-THM System Manajemen.';
  const watermarkLabel = watermarkText || 'THS-THM';
  const watermarkAlpha = watermarkOpacity ?? 0.04;
  // Body/isi dokumen dari pengaturan — placeholder diisi dari data dokumen.
  const bodyText = template?.body
    ? fillTemplateText(template.body, {
        nama: member?.namaLengkap,
        nomor: nomorDokumen,
        tingkat: member?.tingkat ?? undefined,
        ranting: member?.ranting?.nama ?? undefined,
        judul,
        orgNama,
        tanggal: new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
      })
    : undefined;

  return h(
    Document,
    null,
    h(
      Page,
      { size: 'A4', style: styles.page },
      // Latar (background) opsional dari pengaturan Template Dokumen
      template?.background
        ? h(Image, { key: 'bg', src: template.background, style: styles.backgroundImage })
        : null,
      // Security Watermark
      h(
        View,
        { style: { ...styles.watermark, opacity: watermarkAlpha } },
        h(Text, { style: styles.watermarkText }, watermarkLabel),
      ),
      // Header
      h(
        View,
        { style: styles.header },
        h(Text, { style: styles.title }, orgNama),
        ...(orgAlamat
          ? [
              h(
                Text,
                { key: 'alamat', style: { fontSize: 10, color: '#777', marginBottom: 4 } },
                orgAlamat,
              ),
            ]
          : []),
        h(Text, { style: styles.subtitle }, judul),
      ),
      // Body/isi dokumen (opsional — bila kosong, tata letak bawaan dipertahankan)
      ...(bodyText
        ? [
            h(
              View,
              { key: 'body-template', style: styles.bodyBlock },
              h(Text, { style: styles.bodyText }, bodyText),
            ),
          ]
        : []),
      // Nomor Dokumen
      h(
        View,
        { style: styles.section },
        h(Text, { style: styles.label }, 'Nomor Dokumen'),
        h(Text, { style: styles.value }, nomorDokumen),
      ),
      // Member Info
      ...(member
        ? [
            h(
              View,
              { style: styles.row, key: 'row1' },
              h(
                View,
                { key: 'nama' },
                h(Text, { style: styles.label }, 'Nama'),
                h(Text, { style: styles.value }, member.namaLengkap),
              ),
              h(
                View,
                { key: 'noAnggota' },
                h(Text, { style: styles.label }, 'No. Anggota'),
                h(Text, { style: styles.value }, member.nomorAnggota),
              ),
            ),
            h(
              View,
              { style: styles.row, key: 'row2' },
              h(
                View,
                { key: 'tingkat' },
                h(Text, { style: styles.label }, 'Tingkat'),
                h(Text, { style: styles.value }, member.tingkat || '-'),
              ),
              h(
                View,
                { key: 'ranting' },
                h(Text, { style: styles.label }, 'Ranting'),
                h(Text, { style: styles.value }, member.ranting?.nama || '-'),
              ),
            ),
          ]
        : []),
      // QR Code
      h(
        View,
        { style: styles.qrContainer },
        h(Image, { src: qrDataUrl, style: styles.qrImage }),
        h(Text, { style: { fontSize: 8, marginTop: 4 } }, 'Scan untuk verifikasi'),
      ),
      // Penandatangan (1-3 blok) — dari penugasan per tipe dokumen
      ...(signers && signers.length > 0
        ? [
            h(
              View,
              {
                key: 'signers',
                style: {
                  flexDirection: 'row',
                  justifyContent: signers.length === 1 ? 'flex-end' : 'space-between',
                  alignItems: 'flex-end',
                  marginTop: 28,
                  gap: 24,
                },
              },
              ...signers
                .filter((s) => s && (s.signerName || s.signerTitle))
                .map((s, i) =>
                  h(
                    View,
                    { key: `signer-${i}`, style: styles.signerBlock },
                    s.signatureUrl
                      ? h(Image, { src: s.signatureUrl, style: styles.signatureImage })
                      : null,
                    s.stampUrl || stampUrl
                      ? h(Image, { src: s.stampUrl || stampUrl, style: styles.stampImage })
                      : null,
                    h(Text, { style: { fontSize: 12, fontWeight: 'bold' } }, s.signerName),
                    s.signerTitle
                      ? h(
                          Text,
                          { style: { fontSize: 10, color: '#555', marginTop: 2 } },
                          s.signerTitle,
                        )
                      : null,
                  ),
                ),
            ),
          ]
        : []),
      // Footer
      h(Text, { style: styles.footer }, footer),
    ),
  );
}
