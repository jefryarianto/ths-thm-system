const React = require('react');
const { Document, Page, View, Text, Image, StyleSheet } = require('@react-pdf/renderer');

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 12, fontFamily: 'Helvetica' },
  header: { marginBottom: 20, textAlign: 'center' as const },
  title: { fontSize: 18, fontWeight: 'bold' as const, marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 4, color: '#555' },
  section: { marginBottom: 16 },
  label: { fontSize: 10, color: '#888', marginBottom: 2 },
  value: { fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 4 },
  qrContainer: { alignItems: 'center' as const, marginTop: 20 },
  qrImage: { width: 100, height: 100 },
  footer: { position: 'absolute' as const, bottom: 30, left: 40, right: 40, textAlign: 'center' as const, fontSize: 8, color: '#999' },
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
}

const h = React.createElement;

export function buildPdfDocument({ type, nomorDokumen, member, qrDataUrl }: PdfDocProps) {
  return h(Document, null,
    h(Page, { size: 'A4', style: styles.page },
      // Header
      h(View, { style: styles.header },
        h(Text, { style: styles.title }, 'THS-THM System Manajemen'),
        h(Text, { style: styles.subtitle }, docTypeLabels[type] || 'DOKUMEN'),
      ),
      // Nomor Dokumen
      h(View, { style: styles.section },
        h(Text, { style: styles.label }, 'Nomor Dokumen'),
        h(Text, { style: styles.value }, nomorDokumen),
      ),
      // Member Info
      ...member ? [
        h(View, { style: styles.row, key: 'row1' },
          h(View, { key: 'nama' },
            h(Text, { style: styles.label }, 'Nama'),
            h(Text, { style: styles.value }, member.namaLengkap),
          ),
          h(View, { key: 'noAnggota' },
            h(Text, { style: styles.label }, 'No. Anggota'),
            h(Text, { style: styles.value }, member.nomorAnggota),
          ),
        ),
        h(View, { style: styles.row, key: 'row2' },
          h(View, { key: 'tingkat' },
            h(Text, { style: styles.label }, 'Tingkat'),
            h(Text, { style: styles.value }, member.tingkat || '-'),
          ),
          h(View, { key: 'ranting' },
            h(Text, { style: styles.label }, 'Ranting'),
            h(Text, { style: styles.value }, member.ranting?.nama || '-'),
          ),
        ),
      ] : [],
      // QR Code
      h(View, { style: styles.qrContainer },
        h(Image, { src: qrDataUrl, style: styles.qrImage }),
        h(Text, { style: { fontSize: 8, marginTop: 4 } }, 'Scan untuk verifikasi'),
      ),
      // Footer
      h(Text, { style: styles.footer },
        'Dokumen ini valid dan terverifikasi. Diterbitkan oleh THS-THM System Manajemen.',
      ),
    ),
  );
}
