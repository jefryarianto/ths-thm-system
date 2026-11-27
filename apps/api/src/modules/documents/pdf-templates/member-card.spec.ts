/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildMemberCardBatchPdf, buildMemberCardPdf } from './member-card';

const { CARD, BACK } = require('../../../common/utils/card-design');

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

function findByKey(node: any, key: string): any {
  if (node == null) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByKey(child, key);
      if (found) return found;
    }
    return null;
  }
  if (node.key === key) return node;
  if (node.props?.children) return findByKey(node.props.children, key);
  return null;
}

function collectFontFamilies(node: any, out: string[] = []): string[] {
  if (node == null) return out;
  if (Array.isArray(node)) {
    node.forEach((child) => collectFontFamilies(child, out));
    return out;
  }
  const style = node.props?.style;
  if (style) {
    const entries = Array.isArray(style) ? style : [style];
    entries.forEach((entry: any) => {
      if (entry && typeof entry === 'object' && entry.fontFamily) {
        out.push(String(entry.fontFamily));
      }
    });
  }
  if (node.props?.children) collectFontFamilies(node.props.children, out);
  return out;
}

function collectSrcs(node: any, out: string[] = []): string[] {
  if (node == null) return out;
  if (Array.isArray(node)) {
    node.forEach((child) => collectSrcs(child, out));
    return out;
  }
  if (node.props?.src) out.push(String(node.props.src));
  if (node.props?.children) collectSrcs(node.props.children, out);
  return out;
}

function makeProps(overrides: any = {}): any {
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
  it('builds the PDF without React key warnings', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      buildMemberCardPdf(makeProps());
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });

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

  it('inherits Plus Jakarta Sans on both PDF pages', () => {
    const doc = buildMemberCardPdf(makeProps());
    const front = findByKey(doc, 'front');
    const back = findByKey(doc, 'back');

    expect(front.props.style.fontFamily).toBe('Plus Jakarta Sans');
    expect(back.props.style.fontFamily).toBe('Plus Jakarta Sans');
    expect(new Set(collectFontFamilies(doc))).toEqual(new Set(['Plus Jakarta Sans']));
  });

  it('inherits Plus Jakarta Sans on the combined PNG page', () => {
    const doc = buildMemberCardPdf(makeProps(), { combined: true });

    expect(doc.props.children.props.style.fontFamily).toBe('Plus Jakarta Sans');
  });

  it('inherits Plus Jakarta Sans on batch PDF pages', () => {
    const doc = buildMemberCardBatchPdf([makeProps()]);

    expect(findByKey(doc, 'batch-0').props.style.fontFamily).toBe('Plus Jakarta Sans');
  });

  it('places the signer block using BACK.signer on the back page', () => {
    const back = findByKey(buildMemberCardPdf(makeProps()), 'back');
    const signer = findByKey(back, 'sig');

    expect(signer).toBeTruthy();
    expect(signer.props.style).toMatchObject({
      right: BACK.signer.right,
      bottom: BACK.signer.bottom,
      width: BACK.signer.w,
      height: BACK.signer.h,
    });
    expect(collectText(signer).join(' ').toUpperCase()).toContain('KOORDINATOR');
    expect(findByKey(signer, 'sig-title').props.style).toMatchObject({
      left: BACK.signer.title.left,
      top: BACK.signer.title.top,
      fontSize: BACK.signer.title.fontSize,
      textAlign: 'left',
    });
    expect(findByKey(signer, 'sig-name').props.style).toMatchObject({
      left: BACK.signer.name.left,
      bottom: BACK.signer.name.bottom,
      fontSize: BACK.signer.name.fontSize,
      textAlign: 'left',
    });
  });

  it('falls back to cardConfig.signerTitle when the first signer has no title', () => {
    const props = makeProps();
    props.cardConfig.signers = [{ signerName: 'Yoseph', signerTitle: '' }];
    props.cardConfig.signerTitle = 'Koordinator Khusus';
    const back = findByKey(buildMemberCardPdf(props), 'back');
    const signer = findByKey(back, 'sig');

    expect(collectText(signer).join(' ')).toContain('KOORDINATOR KHUSUS');
  });

  it('prefers the first signer title over the legacy cardConfig title', () => {
    const props = makeProps();
    props.cardConfig.signers = [{ signerName: 'Yoseph', signerTitle: 'Kepala Distrik' }];
    props.cardConfig.signerTitle = 'Koordinator';
    const back = findByKey(buildMemberCardPdf(props), 'back');
    const signer = findByKey(back, 'sig');

    expect(collectText(findByKey(signer, 'sig-title')).join(' ')).toContain('KEPALA DISTRIK');
  });

  it('defaults the signer title when no signer or legacy title is present', () => {
    const props = makeProps();
    props.cardConfig.signers = [];
    delete props.cardConfig.signerTitle;
    const back = findByKey(buildMemberCardPdf(props), 'back');
    const signer = findByKey(back, 'sig');

    expect(collectText(findByKey(signer, 'sig-title')).join(' ')).toContain(
      'KOORDINATOR DISTRIK',
    );
  });

  it('renders the stamp image only when stampDataUrl is provided', () => {
    const stamp = 'data:image/png;base64,STAMP';
    const propsWithStamp = makeProps();
    propsWithStamp.stampDataUrl = stamp;
    const propsWithoutStamp = makeProps();
    propsWithoutStamp.stampDataUrl = null;

    const stampWith = findByKey(
      findByKey(buildMemberCardPdf(propsWithStamp), 'back'),
      'stamp',
    );
    const stampWithout = findByKey(
      findByKey(buildMemberCardPdf(propsWithoutStamp), 'back'),
      'stamp',
    );

    expect(collectSrcs(stampWith)).toContain(stamp);
    expect(collectSrcs(stampWithout)).toEqual([]);
    expect(collectText(stampWithout)).not.toContain('STEMPEL');
  });
});
