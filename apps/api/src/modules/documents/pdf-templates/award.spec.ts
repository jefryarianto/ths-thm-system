/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildAwardPdf } from './award';

/** Telusuri elemen react-pdf secara rekursif untuk menemukan <Page>. */
function findPage(el: any): any {
  if (!el || typeof el !== 'object') return null;
  if (el.type === 'PAGE') return el;
  const c = el.props && el.props.children;
  const kids = Array.isArray(c) ? c : [c];
  for (const k of kids) {
    const found = findPage(k);
    if (found) return found;
  }
  return null;
}

/** Cari komponen dengan tipe tertentu (react-pdf memakai tag UPPERCASE, mis. 'IMAGE'). */
function findByType(el: any, type: string): any[] {
  const results: any[] = [];
  if (!el || typeof el !== 'object') return results;
  if (el.type === type) results.push(el);
  const c = el.props && el.props.children;
  const kids = Array.isArray(c) ? c : [c];
  for (const k of kids) results.push(...findByType(k, type));
  return results;
}

/** Kumpulkan semua teks pada pohon elemen. */
function collectText(el: any): string {
  if (el == null) return '';
  if (typeof el === 'string' || typeof el === 'number') return String(el);
  let out = '';
  if (el.props && el.props.children) {
    const kids = Array.isArray(el.props.children)
      ? el.props.children
      : [el.props.children];
    for (const k of kids) out += ` ${collectText(k)}`;
  }
  return out;
}

const baseProps = {
  recipientName: 'Budi Santoso',
  awardNumber: 'PP-2026-AB12CD34',
  issuedDate: '10 Oktober 2026',
  signers: [
    { signerName: 'Yoseph Pehan Betan', signerTitle: 'Koordinator Distrik' },
  ],
};

describe('buildAwardPdf (Piagam Penghargaan — A4 landscape)', () => {
  it('membuat dokumen satu halaman landscape 1188×840', () => {
    const doc = buildAwardPdf(baseProps);
    const page = findPage(doc);
    expect(page).toBeTruthy();
    expect(page.props.size).toEqual([1188, 840]);
  });

  it('tidak menyertakan background bila template.background kosong', () => {
    const doc = buildAwardPdf(baseProps);
    expect(findByType(doc, 'IMG').length).toBe(0);
  });

  it('merender background gambar bila template.background diisi', () => {
    const doc = buildAwardPdf({
      ...baseProps,
      template: { background: '/abs/uploads/doc-templates/piagam.png' },
    });
    const images = findByType(doc, 'IMAGE');
    expect(images.some((img) => img.props.src === '/abs/uploads/doc-templates/piagam.png')).toBe(
      true,
    );
  });

  it('mengisi body template dengan placeholder {{nama}} & {{nomor}}', () => {
    const doc = buildAwardPdf({
      ...baseProps,
      template: { body: 'Diberikan kepada {{nama}} nomor {{nomor}}.' },
    });
    const text = collectText(doc);
    expect(text).toContain('Diberikan kepada Budi Santoso nomor PP-2026-AB12CD34.');
  });

  it('memakai judul bawaan PIAGAM PENGHARGAAN bila template.judul kosong', () => {
    const text = collectText(buildAwardPdf(baseProps));
    expect(text).toContain('PIAGAM PENGHARGAAN');
  });

  it('memakai judul dari template bila diisi', () => {
    const text = collectText(
      buildAwardPdf({ ...baseProps, template: { judul: 'PIAGAM PRESTASI' } }),
    );
    expect(text).toContain('PIAGAM PRESTASI');
    expect(text).not.toContain('PIAGAM PENGHARGAAN');
  });
});
