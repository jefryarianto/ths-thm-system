/**
 * Normalisasi string tanggal agar aman untuk kolom `DateTime` Prisma.
 *
 * Prisma (versi yang dipakai di proyek ini) hanya menerima ISO-8601 DateTime
 * LENGKAP — yaitu dengan komponen waktu, mis. `1995-01-01T00:00:00.000Z`.
 * Format date-only `yyyy-MM-dd` (mis. dari client) akan ditolak dengan
 * `PrismaClientValidationError: invalid value ... premature end of input.
 * Expected ISO-8601 DateTime`, yang di API berujung HTTP 500
 * "Internal server error".
 *
 * Helper ini menormalkan case date-only tersebut menjadi tengah malam UTC
 * tanpa mengubah nilai lain.
 */
export function normalizePrismaDate(value?: string | null): string | undefined {
  if (value == null) return undefined;
  const s = value.trim();
  if (s === '') return undefined;
  // `yyyy-MM-dd` → tambahkan komponen waktu UTC agar diterima Prisma.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00.000Z`;
  return s;
}