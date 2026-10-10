/**
 * Isi placeholder pada teks template dokumen, mis.
 * `Diberikan kepada {{nama}} ...` → `Diberikan kepada Budi ...`.
 *
 * Format placeholder: `{{kata}}` (spasi di dalam kurung diizinkan). Placeholder
 * yang tidak dikenali / nilainya kosong dibiarkan apa adanya agar mudah dikenali
 * saat pratinjau.
 */
export function fillTemplateText(
  text: string,
  vars: Record<string, string | number | undefined | null>,
): string {
  return String(text).replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match, key: string) => {
    const value = vars[key];
    return value !== undefined && value !== null && value !== '' ? String(value) : match;
  });
}
