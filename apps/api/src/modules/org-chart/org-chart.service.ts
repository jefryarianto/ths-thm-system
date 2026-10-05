import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrgChartService {
  private readonly logger = new Logger(OrgChartService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrgChart(isPublic = false, scope?: UserScope) {
    // Get all organizational levels
    const isVisibleFilter = isPublic ? { isVisible: true } : {};

    let nasionalWhere: Prisma.NasionalWhereInput = { ...isVisibleFilter };
    let distrikWhere: Prisma.DistrikWhereInput = { ...isVisibleFilter };
    let wilayahWhere: Prisma.WilayahWhereInput = { ...isVisibleFilter };
    let rantingWhere: Prisma.RantingWhereInput = { ...isVisibleFilter };

    if (!isPublic && scope) {
      if (scope.rantingId) {
        rantingWhere = { ...rantingWhere, id: scope.rantingId };
        wilayahWhere = { ...wilayahWhere, rantings: { some: { id: scope.rantingId } } };
        distrikWhere = {
          ...distrikWhere,
          wilayahs: { some: { rantings: { some: { id: scope.rantingId } } } },
        };
        nasionalWhere = {
          ...nasionalWhere,
          distriks: {
            some: { wilayahs: { some: { rantings: { some: { id: scope.rantingId } } } } },
          },
        };
      } else if (scope.wilayahId) {
        wilayahWhere = { ...wilayahWhere, id: scope.wilayahId };
        distrikWhere = { ...distrikWhere, wilayahs: { some: { id: scope.wilayahId } } };
        nasionalWhere = {
          ...nasionalWhere,
          distriks: { some: { wilayahs: { some: { id: scope.wilayahId } } } },
        };
      } else if (scope.distrikId) {
        distrikWhere = { ...distrikWhere, id: scope.distrikId };
        nasionalWhere = { ...nasionalWhere, distriks: { some: { id: scope.distrikId } } };
      }
    }

    const nasional = await this.prisma.nasional.findMany({
      where: nasionalWhere,
      include: {
        distriks: {
          where: distrikWhere,
          include: {
            wilayahs: {
              where: wilayahWhere,
              include: {
                rantings: {
                  where: rantingWhere,
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
