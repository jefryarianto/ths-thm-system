import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NraService {
  private readonly logger = new Logger(NraService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate NRA in format: [kode_distrik]-[kode_wilayah][kode_ranting]-[3digit_urut]-[tahun_dadar]
   * Example: LRT-0103-001-1993  (kode distrik teks seperti LRT, kode wilayah 2 digit,
   *           kode ranting 2 digit per-wilayah — unik dalam satu wilayah)
   *
   * Uses a Prisma transaction to atomically read the latest sequence number
   * and compute the next one, preventing duplicates under concurrent creates.
   */
  async generateMemberNumber(rantingId: string, tahunDadar?: string): Promise<string> {
    // Use a transaction to ensure atomic read of the org structure + sequence.
    // IMPORTANT: all queries must use `tx` (the transaction-scoped client), NOT
    // `this.prisma`, otherwise they bypass the transaction isolation.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (this.prisma as any).$transaction(async (tx: any) => {
      // Fetch ranting with org structure
      const ranting = await tx.ranting.findUnique({
        where: { id: rantingId },
        include: { wilayah: { include: { distrik: true } } },
      });

      // Kode distrik boleh teks (mis. "LRT") atau angka ("0103"); jika berformat
      // lama ber-prefix ("DST-0114") ambil segmen terakhir supaya konsisten.
      const kodeDistrik = ranting?.wilayah?.distrik?.kodeDistrik?.split('-').pop()?.trim() || '0000';
      // Kode wilayah & ranting selalu 2 digit (mis. "01", "03").
      const kodeWilayah = (ranting?.wilayah?.kodeWilayah?.split('-').pop() || '00').padStart(2, '0');
      const kodeRanting = (ranting?.kodeRanting?.split('-').pop() || '00').padStart(2, '0');

      // Find the latest member in this ranting to get the current sequence number.
      // Using findFirst + orderBy nomorAnggota DESC returns the member with the
      // highest numeric sequence part, because the NRA format is fixed-width
      // (e.g. 0114-0101-005-2026), so lexical sort matches numeric sort.
      const latestMember = await tx.anggota.findFirst({
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
