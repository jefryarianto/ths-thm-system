/**
 * Parse durasi ('7d', '15m', '1h', '30s', '500ms', atau angka mentah dalam
 * milidetik) menjadi milidetik. Mengembalikan `null` jika format tidak dikenal.
 */
export function parseDurationToMs(value: string): number | null {
  const trimmed = value.trim();
  const match = /^(\d+)\s*(ms|s|m|h|d)$/i.exec(trimmed);
  if (match) {
    const n = parseInt(match[1], 10);
    const factor: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return n * factor[match[2].toLowerCase()];
  }
  const numeric = parseInt(trimmed, 10);
  return Number.isNaN(numeric) ? null : numeric;
}