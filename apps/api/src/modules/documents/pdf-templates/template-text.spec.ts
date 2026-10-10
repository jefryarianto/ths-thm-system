import { fillTemplateText } from './template-text';

describe('fillTemplateText', () => {
  it('mengganti placeholder {{kata}} dengan nilai dari vars', () => {
    expect(fillTemplateText('Diberikan kepada {{nama}} dengan {{nomor}}', { nama: 'Budi', nomor: 'SPD-1' })).toBe(
      'Diberikan kepada Budi dengan SPD-1',
    );
  });

  it('mengizinkan spasi di dalam kurung ({{ nama }})', () => {
    expect(fillTemplateText('Atas kelulusan {{ kegiatan }}', { kegiatan: 'Pelatihan Dasar' })).toBe(
      'Atas kelulusan Pelatihan Dasar',
    );
  });

  it('mendukung nilai number', () => {
    expect(fillTemplateText('Nilai akhir {{nilai}}', { nilai: 88 })).toBe('Nilai akhir 88');
  });

  it('placeholder tak dikenal dibiarkan apa adanya', () => {
    expect(fillTemplateText('Halo {{tidak_ada}}, nomor {{nomor}}', { nomor: 'X-1' })).toBe(
      'Halo {{tidak_ada}}, nomor X-1',
    );
  });

  it('nilai kosong/null/undefined tidak mengganti placeholder', () => {
    expect(
      fillTemplateText('{{a}}|{{b}}|{{c}}', { a: '', b: null, c: undefined }),
    ).toBe('{{a}}|{{b}}|{{c}}');
  });

  it('teks tanpa placeholder dikembalikan utuh', () => {
    expect(fillTemplateText('Teks biasa saja', {})).toBe('Teks biasa saja');
  });
});
