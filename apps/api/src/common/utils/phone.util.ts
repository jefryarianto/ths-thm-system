/**
 * Normalisasi nomor HP Indonesia ke format `08xxxxxxxxxx` untuk pencocokan
 * yang konsisten di seluruh modul (login, import, validasi duplikat).
 *
 * - Buang spasi, tanda baca (titik, minus, kurung)
 * - Konversi `+62...` / `62...` → `0...`
 */
export function normalizePhone(raw?: string | null): string {
  if (!raw) return '';
  let s = raw.replace(/[\s\-().]/g, '');
  if (s.startsWith('+62')) s = '0' + s.slice(3);
  else if (s.startsWith('62')) s = '0' + s.slice(2);
  return s;
}