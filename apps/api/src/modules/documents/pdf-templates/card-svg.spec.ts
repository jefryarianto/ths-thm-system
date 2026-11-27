/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildCardSvg, CardSvgData } from './card-svg';

const { CARD, BACK } = require('../../../common/utils/card-design');

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

  it('renders pekerjaan on front to match PDF placement', () => {
    const svg = buildCardSvg(makeData());
    const front = svg.split('<g id="face-back"')[0];
    expect(front).toContain('Pekerjaan');
    expect(front).toContain('GURU');
  });

  it('truncates long pekerjaan and pelantikan to avoid overflow', () => {
    const long = 'PEKERJAAN SANGAT PANJANG SEKALI YANG TIDAK BOLEH MELUBER KELUAR KARTU KTA';
    const svg = buildCardSvg(makeData({ pekerjaan: long, pelantikan: long }));
    expect(svg).not.toContain(long);
    expect(svg).toContain('…');
  });

  it('uses Plus Jakarta Sans for every SVG text node', () => {
    const svg = buildCardSvg(makeData());
    expect(svg).toContain('Plus Jakarta Sans');
    expect(svg).not.toContain('Roboto');
    expect(svg).not.toContain('OCR A Extended');
  });

  it('places the signer block and stamp using BACK.signer on the back', () => {
    const svg = buildCardSvg({ ...makeData(), stampDataUrl: 'data:image/png;base64,STAMP' });
    const back = svg.split('<g id="face-back"')[1];
    const titleX = CARD.W - BACK.signer.right - BACK.signer.title.right;
    const titleY =
      CARD.H - BACK.signer.bottom - BACK.signer.h + BACK.signer.title.top + BACK.signer.title.fontSize;
    const stampX =
      CARD.W - BACK.signer.right - BACK.signer.stamp.right - BACK.signer.stamp.size;
    const stampY =
      CARD.H - BACK.signer.bottom - BACK.signer.stamp.bottom - BACK.signer.stamp.size;

    expect(back).toContain(`x="${titleX}" y="${titleY}"`);
    expect(back).toContain('>KOORDINATOR</text>');
    expect(back).toContain(`x="${stampX}" y="${stampY}"`);
  });

  it('prefers the first signer title over the legacy signerTitle', () => {
    const data = makeData();
    data.signers = [{ signerName: 'Yoseph', signerTitle: 'Kepala Distrik' }];
    const back = buildCardSvg(data).split('<g id="face-back"')[1];

    expect(back).toContain('>KEPALA DISTRIK</text>');
    expect(back).not.toContain('>KOORDINATOR</text>');
  });

  it('defaults the signer title when no signer or legacy title is present', () => {
    const data = makeData();
    data.signers = [];
    delete data.signerTitle;
    const back = buildCardSvg(data).split('<g id="face-back"')[1];

    expect(back).toContain('>KOORDINATOR DISTRIK</text>');
  });

  it('renders the stamp image only when stampDataUrl is provided', () => {
    const stamp = 'data:image/png;base64,STAMP';
    const withStamp = buildCardSvg({ ...makeData(), stampDataUrl: stamp });
    const withoutStamp = buildCardSvg({ ...makeData(), stampDataUrl: null });

    expect(withStamp).toContain(`href="${stamp}"`);
    expect(withoutStamp).not.toContain(stamp);
    expect(withoutStamp).not.toContain('STEMPEL');
  });
});
