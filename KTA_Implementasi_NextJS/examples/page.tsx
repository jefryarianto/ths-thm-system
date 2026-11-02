// Contoh App Router: letakkan sebagai app/kta-contoh/page.tsx.
import { KtaPreview, type MemberKta } from '../../components/kta/KtaPreview';

const contoh: MemberKta = {
  nomorAnggota: 'LRT-0103-001-1994', namaLengkap: 'JEFRY ARIANTO BABA', jenisKelamin: 'L',
  ranting: 'SAN JUAN LEBAO', fotoUrl: '/kta/foto-contoh.png', qrImageUrl: '/kta/qr-contoh.png', tingkat: 'MUDA',
  tempatLahir: 'ROTE', tanggalLahir: '6 JULI 1983', alamat: 'JALAN IKAN TENGGIRI NO. 40 POSTOH, LARANTUKA, FLORES TIMUR, NTT',
  namaKoordinator: 'E. HENDRIKUS MASAN BEDA',
};
export default function Page() {
  return <main><KtaPreview member={contoh} /></main>;
}
