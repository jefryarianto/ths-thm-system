import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NraService {
  private readonly logger = new Logger(NraService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate NRA in format: [kode_distrik]-[kode_wilayah][kode_ranting]-[3digit_urut]-[tahun_dadar]
   * Example: 0114-0101-001-1993
   * Sequential number continues from the last member's sequence in the ranting.
   */
  async generateMemberNumber(rantingId: string, tahunDadar?: string): Promise<string> {
    // Fetch ranting with org structure
    const ranting = await this.prisma.ranting.findUnique({
      where: { id: rantingId },
      include: { wilayah: { include: { distrik: true } } },
    });

    // Extract numeric codes from kode fields
    const kodeDistrik = ranting?.wilayah?.distrik?.kodeDistrik?.replace(/^\D+/g, '') || '0000';
    const kodeWilayah = ranting?.wilayah?.kodeWilayah?.split('-').pop() || '00';
    const kodeRanting = ranting?.kodeRanting?.split('-').pop() || '00';

    // Find max sequential number from existing members in this ranting
    const existingMembers = await this.prisma.anggota.findMany({
      where: { rantingId, deletedAt: null },
      select: { nomorAnggota: true },
    });
    let maxSeq = 0;
    for (const m of existingMembers) {
      if (!m.nomorAnggota) continue;
      const parts = m.nomorAnggota.split('-');
      const seq = parseInt(parts[parts.length - 2] || '0', 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
    const urut = String(maxSeq + 1).padStart(3, '0');
    const tahun = tahunDadar || String(new Date().getFullYear());

    this.logger.debug(`Generated NRA: ${kodeDistrik}-${kodeWilayah}${kodeRanting}-${urut}-${tahun} for ranting ${rantingId}`);

    return `${kodeDistrik}-${kodeWilayah}${kodeRanting}-${urut}-${tahun}`;
  }
}
