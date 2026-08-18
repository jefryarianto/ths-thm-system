import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrgChartService {
  private readonly logger = new Logger(OrgChartService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrgChart(isPublic = false) {
    // Get all organizational levels
    const whereVisible = isPublic ? { isVisible: true } : {};

    const nasional = await this.prisma.nasional.findMany({
      where: whereVisible,
      include: {
        distriks: {
          where: whereVisible,
          include: {
            wilayahs: {
              where: whereVisible,
              include: {
                rantings: {
                  where: whereVisible,
                  include: {
                    _count: { select: { anggota: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Format for tree visualization
    const tree = nasional.map((n) => ({
      id: n.id,
      name: n.nama,
      code: n.kode,
      type: 'nasional' as const,
      children: n.distriks.map((d) => ({
        id: d.id,
        name: d.nama,
        code: d.kodeDistrik,
        type: 'distrik' as const,
        children: d.wilayahs.map((w) => ({
          id: w.id,
          name: w.nama,
          code: w.kodeWilayah,
          type: 'wilayah' as const,
          children: w.rantings.map((r) => ({
            id: r.id,
            name: r.nama,
            code: r.kodeRanting,
            type: 'ranting' as const,
            memberCount: r._count.anggota,
          })),
        })),
      })),
    }));

    // Calculate summary statistics
    let totalMembers = 0;
    let totalRanting = 0;
    let totalWilayah = 0;
    let totalDistrik = 0;

    for (const n of nasional) {
      for (const d of n.distriks) {
        totalDistrik++;
        for (const w of d.wilayahs) {
          totalWilayah++;
          for (const r of w.rantings) {
            totalRanting++;
            totalMembers += r._count.anggota;
          }
        }
      }
    }

    return {
      success: true,
      data: {
        tree,
        summary: {
          totalNasional: nasional.length,
          totalDistrik,
          totalWilayah,
          totalRanting,
          totalMembers,
        },
      },
    };
  }
}