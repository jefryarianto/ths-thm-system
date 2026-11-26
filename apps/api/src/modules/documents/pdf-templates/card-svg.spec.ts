/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildCardSvg, CardSvgData } from './card-svg';

function makeData(overrides: Partial<CardSvgData['member']> = {}): CardSvgData {
  return {
    member: {
      namaLengkap: 'Budi Santoso',
      nomorAnggota: 'NRA-1',
      jenisKelamin: 'L',
      tempatLahir: 'Bandung',
      tanggalLahir: '1990-01-02',
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
    nomorDokumen: 'KTA-1',
    qrDataUrl: 'data:image/png;base64,QR',
    verificationUrl: 'https://example.com/verify/1',
    signerName: 'Yoseph',
    signerTitle: 'Koordinator',
  };
}

describe('buildCardSvg pekerjaan/pelantikan', () => {
  it('renders pekerjaan and pelantikan on back', () => {
    const svg = buildCardSvg(makeData());
    expect(svg.toUpperCase()).toContain('PEKERJAAN');
    expect(svg.toUpperCase()).toContain('GURU');
    expect(svg.toUpperCase()).toContain('PELANTIKAN');
    expect(svg.toUpperCase()).toContain('12 JULI 2020');
  });

  it('truncates long pekerjaan and pelantikan to avoid overflow', () => {
    const long = 'PEKERJAAN SANGAT PANJANG SEKALI YANG TIDAK BOLEH MELUBER KELUAR KARTU KTA';
    const svg = buildCardSvg(makeData({ pekerjaan: long, pelantikan: long }));
    expect(svg).not.toContain(long);
    expect(svg).toContain('…');
  });
});
