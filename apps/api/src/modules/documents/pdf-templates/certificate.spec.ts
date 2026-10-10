/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildCertificatePdf } from './certificate';

/** Telusuri elemen react-pdf secara rekursif untuk menemukan semua <Page>. */
function findPages(el: any): any[] {
  if (!el || typeof el !== 'object') return [];
  const pages: any[] = [];
  if (el.type === 'PAGE') pages.push(el);
  const c = el.props && el.props.children;
  const kids = Array.isArray(c) ? c : [c];
  for (const k of kids) pages.push(...findPages(k));
  return pages;
}

/** Kumpulkan semua teks pada pohon elemen. */
function collectText(el: any): string {
  if (el == null) return '';
  if (typeof el === 'string' || typeof el === 'number') return String(el);
  let out = '';
  const c = el.props && el.props.children;
  const kids = Array.isArray(c) ? c : [c];
  for (const k of kids) out += ` ${collectText(k)}`;
  return out;
}

const baseProps = {
  recipientName: 'Budi Santoso',
  certificateNumber: 'SPD-2026-AB12CD34',
  eventTitle: 'Pendadaran 2026',
  location: 'Semarang',
  ranting: 'Ranting A',
  wilayah: 'Wilayah B',
  distrik: 'Distrik C',
  finalScore: '88',
  predicate: 'Baik Sekali',
  status: 'Lulus',
  issuedDate: '10 Oktober 2026',
  signers: [{ signerName: 'Yoseph Pehan Betan', signerTitle: 'Koordinator Distrik' }],
  aspects: [],
};

describe('buildCertificatePdf — variant & hideBack', () => {
  it('default (pendadaran) memakai sub-judul PENDADARAN & dua halaman', () => {
    const doc = buildCertificatePdf(baseProps);
    const text = collectText(doc);
    expect(text).toContain('PENDADARAN');
    expect(text).toContain('RINCIAN PENILAIAN PENDADARAN');
    expect(findPages(doc)).toHaveLength(2);
  });

  it('variant pelatihan memakai sub-judul PELATIHAN & back title pelatihan', () => {
    const doc = buildCertificatePdf({ ...baseProps, variant: 'pelatihan' });
    const text = collectText(doc);
    expect(text).toContain('PELATIHAN');
    expect(text).toContain('RINCIAN PENILAIAN PELATIHAN');
    expect(text).not.toContain('RINCIAN PENILAIAN PENDADARAN');
  });

  it('hideBack: true hanya mencetak satu halaman (depan)', () => {
    const doc = buildCertificatePdf({ ...baseProps, variant: 'pelatihan', hideBack: true });
    expect(findPages(doc)).toHaveLength(1);
  });

  it('template.judul & subJudul menimpa bawaan', () => {
    const doc = buildCertificatePdf({
      ...baseProps,
      template: { judul: 'SERTIFIKAT', subJudul: 'KEIKUTSERTAAN' },
    });
    const text = collectText(doc);
    expect(text).toContain('KEIKUTSERTAAN');
  });

  it('mengisi body template dengan placeholder {{nama}}', () => {
    const doc = buildCertificatePdf({
      ...baseProps,
      template: { body: 'Diberikan kepada {{nama}} nomor {{nomor}}.' },
    });
    expect(collectText(doc)).toContain('Diberikan kepada Budi Santoso nomor SPD-2026-AB12CD34.');
  });

  it('merender background bila template.background diisi', () => {
    const doc: any = buildCertificatePdf({
      ...baseProps,
      template: { background: '/abs/uploads/doc-templates/sertifikat.png' },
    });
    const images: any[] = [];
    const walk = (el: any) => {
      if (!el || typeof el !== 'object') return;
      if (el.type === 'IMAGE') images.push(el);
      const c = el.props && el.props.children;
      const kids = Array.isArray(c) ? c : [c];
      kids.forEach(walk);
    };
    walk(doc);
    expect(
      images.some((img) => img.props.src === '/abs/uploads/doc-templates/sertifikat.png'),
    ).toBe(true);
  });
});
