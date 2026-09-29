/**
 * Overlap guard in-memory untuk fungsi terjadwal (@Cron).
 *
 * Mencegah eksekusi baru dari pekerjaan yang SAMA selama run sebelumnya
 * masih berjalan di proses ini (mis. cron 30-menit yang siklusnya belum
 * selesai, atau rerun terpicu saat loop panjang).
 *
 * Batasan (penting): flag ini PER-PROSES. Bila API di-scale multi-instance,
 * tiap instance punya flag sendiri — untuk keamanan antar-instance butuh
 * distributed lock (mis. SETNX di Valkey). Lihat audit cron 2026-09.
 */

interface LoggerLike {
  warn: (message: string) => unknown;
}

export type OverlapGuard = <T>(
  name: string,
  fn: () => Promise<T>,
) => Promise<T | undefined>;

export function createOverlapGuard(logger: LoggerLike): OverlapGuard {
  const running = new Set<string>();

  return async function guard<T>(
    name: string,
    fn: () => Promise<T>,
  ): Promise<T | undefined> {
    if (running.has(name)) {
      logger.warn(`[overlap-guard] "${name}" masih berjalan — eksekusi baru dilewati`);
      return undefined;
    }
    running.add(name);
    try {
      return await fn();
    } finally {
      running.delete(name);
    }
  };
}
