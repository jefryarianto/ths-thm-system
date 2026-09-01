/**
 * Utilitas format terpusat untuk tampilan tanggal, rupiah, dan periode (mobile).
 *
 * Aturan penampilan:
 *  - Tanggal SELALU lengkap: "01 September 2026" (hari 2 digit + bulan lengkap).
 *  - Rupiah: "Rp 1.500.000" (pemisah ribuan id-ID, tanpa desimal).
 *  - Periode: "Januari 2026" (bulan lengkap + tahun).
 */

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const rupiahFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/**
 * Format nominal Rupiah: "Rp 1.500.000".
 *
 * Penting: Prisma mengembalikan kolom DECIMAL sebagai STRING (mis. "50000.00"),
 * sehingga nilai harus dikonversi dengan Number() dulu; String#toLocaleString()
 * TIDAK memformat angka.
 */
export function formatRupiah(value: number | string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return `Rp ${value}`;
  return `Rp ${rupiahFormatter.format(num)}`;
}

/** Format tanggal lengkap: "01 September 2026". */
export function formatDate(value: string | number | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

/** Format tanggal + jam: "01 September 2026 14.30". */
export function formatDateTime(value: string | number | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

/**
 * Format periode "YYYY-MM" (atau "YYYY-MM-DD") menjadi "Januari 2026".
 * Jika input tidak cocok, nilai asli dikembalikan apa adanya.
 */
export function formatPeriode(periode: string): string {
  const m = /^(\d{4})-(\d{1,2})/.exec(periode || '');
  if (!m) return periode;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return periode;
  return `${MONTH_NAMES[month - 1]} ${m[1]}`;
}