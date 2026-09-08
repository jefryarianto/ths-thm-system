import { safeIconName, DEFAULT_ICON_FALLBACK } from './icons';

// `safeIconName` menggunakan `Ionicons.glyphMap` (dari @expo/vector-icons v14).
// Mock module tersebut supaya pengujian deterministik tanpa native module.

jest.mock('@expo/vector-icons/Ionicons', () => ({
  __esModule: true,
  default: {
    glyphMap: {
      'add': 'add-glyph',
      'person': 'person-glyph',
      'chevron-forward': 'chevron-forward-glyph',
    },
  },
}));

describe('safeIconName', () => {
  it('mengembalikan nama ikon yang valid (ada di glyphMap)', () => {
    expect(safeIconName('add')).toBe('add');
    expect(safeIconName('person')).toBe('person');
  });

  it('mengembalikan fallback untuk nama yang tidak ada di glyphMap', () => {
    expect(safeIconName('no-such-icon')).toBe(DEFAULT_ICON_FALLBACK);
    expect(safeIconName('proprietary-icon')).toBe(DEFAULT_ICON_FALLBACK);
  });

  it('mengembalikan fallback untuk nilai kosong/null/undefined', () => {
    expect(safeIconName(undefined)).toBe(DEFAULT_ICON_FALLBACK);
    expect(safeIconName(null)).toBe(DEFAULT_ICON_FALLBACK);
    expect(safeIconName('')).toBe(DEFAULT_ICON_FALLBACK);
  });

  it('menghormati fallback yang disediakan pemanggil', () => {
    expect(safeIconName('tidak-ada', 'my-fallback')).toBe('my-fallback');
    expect(safeIconName('add', 'my-fallback')).toBe('add');
  });

  it('TIDAK melempar error saat glyphMap/method tidak tersedia (regresi crash)', () => {
    // Kasus yang dulu crash: memanggil method `hasIcon` yang tidak ada.
    expect(() => safeIconName('add')).not.toThrow();
    expect(() => safeIconName('whatever')).not.toThrow();
  });
});
