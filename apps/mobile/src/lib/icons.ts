import Ionicons from '@expo/vector-icons/Ionicons';

/** Tipe tambahan untuk static member Ionicons yang tidak dideklarasikan oleh @expo/vector-icons. */
interface IoniconsStatic {
  hasIcon(name: string): boolean;
  glyphMap: Record<string, string | number>;
}

const IonStatic = Ionicons as unknown as IoniconsStatic;

/**
 * Nama ikon Ionicons yang dijamin ada di glyphmap — fallback saat nama dinamis
 * (dari map/API) tidak dikenal. Mencegah ikon tampil sebagai "?" / kotak rusak.
 */
export const DEFAULT_ICON_FALLBACK = 'ellipse-outline';

/**
 * Validasi nama ikon Ionicons sebelum dipakai. Nama dari map dinamis / API yang
 * tidak terdaftar di glyphmap (iklan/ikon premium, typo, atau nilai dari server)
 * akan diganti dengan fallback supaya UI tidak menampilkan glyph rusak.
 */
export function safeIconName(name?: string | null, fallback: string = DEFAULT_ICON_FALLBACK): string {
  if (name && IonStatic.hasIcon(name)) {
    return name;
  }
  return fallback;
}

export default safeIconName;