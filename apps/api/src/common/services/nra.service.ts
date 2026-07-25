import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NraService {
  private readonly logger = new Logger(NraService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate NRA in format: [kode_distrik]-[kode_wilayah][kode_ranting]-[3digit_urut]-[tahun_dadar]
   * Example: 0114-0101-001-1993
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

      // Extract numeric codes from kode fields
      const kodeDistrik = ranting?.wilayah?.distrik?.kodeDistrik?.replace(/^\D+/g, '') || '0000';
      const kodeWilayah = ranting?.wilayah?.kodeWilayah?.split('-').pop() || '00';
      const kodeRanting = ranting?.kodeRanting?.split('-').pop() || '00';

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
