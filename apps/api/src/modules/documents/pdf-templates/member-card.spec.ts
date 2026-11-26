/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildMemberCardPdf } from './member-card';

function collectText(node: any, out: string[] = []): string[] {
  if (node == null) return out;
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => collectText(n, out));
    return out;
  }
  if (node.props?.children) collectText(node.props.children, out);
  return out;
}

function makeProps(overrides: any = {}) {
  return {
    member: {
      namaLengkap: 'Budi Santoso',
      nomorAnggota: 'NRA-1',
      tempatLahir: 'Bandung',
      tanggalLahir: '1990-01-02',
      jenisKelamin: 'L',
      tingkat: 'putih',
      tempatDadar: 'Jakarta',
      tahunDadar: '2020',
      pekerjaan: 'Guru',
      pelantikan: '12 JULI 2020',
      ranting: 'Ranting A',
      wilayah: 'Wilayah B',
      distrik: 'Distrik C',
      alamatDistrik: 'Jl. D',
      statusKeanggotaan: 'aktif',
      ...overrides,
    },
    cardConfig: {
      nomorDokumen: 'KTA-1',
      qrDataUrl: 'data:image/png;base64,QR',
      verificationUrl: 'https://example.com/verify/1',
      signerName: 'Yoseph',
      signerTitle: 'Koordinator',
    },
  };
}

describe('buildMemberCardPdf pekerjaan/pelantikan', () => {
  it('renders pekerjaan and pelantikan', () => {
    const doc = buildMemberCardPdf(makeProps());
    const text = collectText(doc).join(' ').toUpperCase();
    expect(text).toContain('PEKERJAAN');
    expect(text).toContain('GURU');
    expect(text).toContain('PELANTIKAN');
    expect(text).toContain('12 JULI 2020');
  });

  it('truncates long pekerjaan and pelantikan to avoid overflow', () => {
    const long = 'PEKERJAAN SANGAT PANJANG SEKALI YANG TIDAK BOLEH MELUBER KELUAR KARTU KTA';
    const doc = buildMemberCardPdf(makeProps({ pekerjaan: long, pelantikan: long }));
    const text = collectText(doc).join(' ');
    expect(text).not.toContain(long);
    expect(text).toContain('…');
  });
});
