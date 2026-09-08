import Ionicons from '@expo/vector-icons/Ionicons';

/**
 * Nama ikon Ionicons yang dijamin ada di glyphmap — fallback saat nama dinamis
 * (dari map/API) tidak dikenal. Mencegah ikon tampil sebagai "?" / kotak rusak.
 */
export const DEFAULT_ICON_FALLBACK = 'ellipse-outline';

/**
 * Akses glyphMap tanpa depends pada type yang tidak dideklarasikan oleh
 * @expo/vector-icons v14. Pada runtime, `Ionicons.glyphMap` memang wujud
 * sebagai static property dari createIconSet — tetapi type-nya tidak ada.
 */
const glyphMap: Record<string, string | number> =
  (Ionicons as unknown as { glyphMap?: Record<string, string | number> }).glyphMap ?? {};

/**
 * Validasi nama ikon Ionicons sebelum dipakai. Nama dari map dinamis / API yang
 * tidak terdaftar di glyphmap (iklan/ikon premium, typo, atau nilai dari server)
 * akan diganti dengan fallback supaya UI tidak menampilkan glyph rusak.
 *
 * Menggunakan `glyphMap` yang memang wujud pada `@expo/vector-icons` v14,
 * bukan `hasIcon` yang tidak tersedia dan menyebabkan TypeError crash.
 */
export function safeIconName(name?: string | null, fallback: string = DEFAULT_ICON_FALLBACK): string {
  if (name && name in glyphMap) {
    return name;
  }
  return fallback;
}

export default safeIconName;