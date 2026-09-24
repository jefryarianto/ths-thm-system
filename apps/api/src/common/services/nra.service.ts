import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ═══════════════════════════════════════════════════════════════════════════════
// NraService — generates Nomor Anggota (NRA)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * NraService generates NRA (Nomor Registrasi Anggota).
 *
 * NRA format: [kode_distrik]-[kode_wilayah][kode_ranting]-[3digit_urut]-[tahun_dadar]
 * Example output: LRT-0103-001-1993, 0114-0101-001-2026
 *
 * Concurrency (race-condition safe):
 *   Generator membaca sequence terbesar lalu menulis (max+1). Pada isolation
 *   default (ReadCommitted), dua transaksi konkuren untuk ranting yang sama
 *   bisa membaca maxSeq identik → NRA duplikat. Mitigasi berlapis:
 *     1. `pg_advisory_xact_lock` per ranting menserialisasi pembacaan sequence
 *        antar transaksi konkuren (lock otomatis lepas saat transaksi commit).
 *     2. Pemanggil yang butuh atomisitas penuh (generate + insert anggota)
 *        mem-passing transaction client-nya lewat param `tx`, sehingga
 *        generate dan create berada dalam SATU transaksi yang sama.
 *     3. UNIQUE constraint pada nomor_anggota tetap menjadi jaring pengaman
 *        terakhir di level DB.
 */

/** Prefix key advisory lock — dipisahkan dari domain lain agar tidak tabrakan. */
const NRA_ADVISORY_LOCK_PREFIX = 'ths-thm:nra:ranting:';

/** Minimal shape of a Prisma client / interactive-transaction client. */
interface NraDbClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ranting: { findUnique(args: any): Promise<any> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  anggota: { findFirst(args: any): Promise<any> };
  $queryRaw?(query: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
}

@Injectable()
export class NraService {
  private readonly logger = new Logger(NraService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate nomor anggota (NRA) berikutnya untuk sebuah ranting.
   *
   * @param rantingId   ID ranting target
   * @param tahunDadar  Tahun pendadaran (fallback: tahun berjalan)
   * @param tx          Transaction client pemanggil (opsional). Bila disediakan,
   *                    seluruh pembacaan sequence + advisory lock berjalan pada
   *                    transaksi pemanggil sehingga generate + insert anggota
   *                    bersifat atomik terhadap generator konkuren.
   */
  async generateMemberNumber(rantingId: string, tahunDadar?: string, tx?: unknown): Promise<string> {
    const result = await this.prisma.$transaction(async (outerTx) => {
      // Pakai transaksi pemanggil bila ada; kalau tidak, pakai tx internal.
      const db = (tx ?? outerTx) as NraDbClient;

      const ranting = await db.ranting.findUnique({
        where: { id: rantingId },
        include: { wilayah: { include: { distrik: true } } },
      });

      if (!ranting) {
        throw new NotFoundException(`Ranting dengan ID ${rantingId} tidak ditemukan`);
      }

      // Strip prefixes like "DST-" from kodeDistrik; always use the last segment
      const kodeDistrik =
        ranting?.wilayah?.distrik?.kodeDistrik?.split('-').pop()?.trim() || '0000';
      const kodeWilayah = (ranting?.wilayah?.kodeWilayah?.split('-').pop() || '00').padStart(2, '0');
      const kodeRanting = (ranting?.kodeRanting?.split('-').pop() || '00').padStart(2, '0');

      // ── Race guard: advisory lock per ranting ──────────────
      // Menahan generator konkuren untuk ranting yang sama sampai transaksi
      // pemegang lock selesai (commit/rollback), sehingga pembacaan maxSeq
      // selalu melihat baris terbaru yang sudah commit.
      if (typeof db?.$queryRaw !== 'function') {
        // Mock/test client tanpa $queryRaw — lock dilewati, UNIQUE constraint
        // di DB tetap menjadi pengaman kebenaran.
        this.logger.warn(
          `NRA: client tanpa $queryRaw — pg_advisory_xact_lock dilewati untuk ranting ${rantingId}`,
        );
      } else {
        try {
          await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${NRA_ADVISORY_LOCK_PREFIX}${rantingId}, 0))`;
        } catch (error) {
          // Non-fatal: kegagalan lock (mis. DB non-Postgres) tidak boleh
          // memblokir pembuatan anggota — unique constraint tetap aktif.
          this.logger.warn(
            `NRA: gagal mengambil advisory lock ranting ${rantingId}: ${(error as Error).message}`,
          );
        }
      }

      // Get latest member in this ranting to compute next sequence number.
      // Fixed-width format ensures lexical sort == numeric sort for the sequence part.
      const latestMember = await db.anggota.findFirst({
        where: { rantingId, deletedAt: null },
        orderBy: { nomorAnggota: 'desc' },
        select: { nomorAnggota: true },
      });

      let maxSeq = 0;
      if (latestMember?.nomorAnggota) {
        const parts = latestMember.nomorAnggota.split('-');
        const seq = parseInt(parts[parts.length - 2] || '0', 10);
        if (!isNaN(seq)) {
          maxSeq = seq;
        }
      }

      const urut = String(maxSeq + 1).padStart(3, '0');
      const tahun = tahunDadar || String(new Date().getFullYear());

      return `${kodeDistrik}-${kodeWilayah}${kodeRanting}-${urut}-${tahun}`;
    });

    this.logger.debug(`Generated NRA: ${result} for ranting ${rantingId}`);
    return result;
  }
}
