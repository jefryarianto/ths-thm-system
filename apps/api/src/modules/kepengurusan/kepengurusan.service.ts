import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';

@Injectable()
export class KepengurusanService {
  constructor(private readonly prisma: PrismaService) {}

  /** Build scope-aware where clause for admin_distrik scoping */
  private buildScopeFilter(scope?: UserScope): Record<string, unknown> {
    if (!scope) return {};
    // Superadmin: no filter (full access)
    if (!scope.rantingId && !scope.wilayahId && !scope.distrikId) return {};
    // District-level: show all kepengurusan within the distrik
    if (scope.distrikId) {
      return {
        OR: [
          { distrikId: scope.distrikId },
          { wilayah: { distrikId: scope.distrikId } },
          { ranting: { wilayah: { distrikId: scope.distrikId } } },
        ],
      };
    }
    // Region-level
    if (scope.wilayahId) {
      return {
        OR: [
          { wilayahId: scope.wilayahId },
          { ranting: { wilayahId: scope.wilayahId } },
        ],
      };
    }
    // Branch-level
    if (scope.rantingId) {
      return { rantingId: scope.rantingId };
    }
    return {};
  }

  async findAll(filters?: {
    level?: string;
    unitId?: string;
    periodeId?: string;
    scope?: UserScope;
  }) {
    const where: Record<string, unknown> = {};

    if (filters?.level === 'distrik' && filters.unitId) {
      where.distrikId = filters.unitId;
    } else if (filters?.level === 'wilayah' && filters.unitId) {
      where.wilayahId = filters.unitId;
    } else if (filters?.level === 'ranting' && filters.unitId) {
      where.rantingId = filters.unitId;
    } else if (filters?.level === 'nasional') {
      where.nasionalId = { not: null };
    }

    if (filters?.periodeId) {
      where.periodeId = filters.periodeId;
    }

    // Apply scope filter for admin_distrik
    const scopeFilter = this.buildScopeFilter(filters?.scope);
    if (Object.keys(scopeFilter).length > 0) {
      where.AND = where.AND || [];
      (where.AND as unknown[]).push(scopeFilter);
    }

    return this.prisma.kepengurusan.findMany({
      where,
      include: {
        user: { select: { id: true, namaLengkap: true, email: true } },
        jabatan: { select: { id: true, nama: true, urutan: true } },
        periode: { select: { id: true, nama: true, isActive: true } },
        distrik: { select: { id: true, nama: true } },
        wilayah: { select: { id: true, nama: true } },
        ranting: { select: { id: true, nama: true } },
        parent: {
          select: {
            id: true,
            user: { select: { namaLengkap: true } },
            jabatan: { select: { nama: true } },
          },
        },
        children: {
          select: {
            id: true,
            user: { select: { namaLengkap: true } },
            jabatan: { select: { nama: true } },
          },
        },
      },
      orderBy: [{ jabatan: { urutan: 'asc' } }],
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.kepengurusan.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, namaLengkap: true, email: true } },
        jabatan: { select: { id: true, nama: true } },
        periode: { select: { id: true, nama: true, isActive: true } },
        distrik: { select: { id: true, nama: true } },
        wilayah: { select: { id: true, nama: true } },
        ranting: { select: { id: true, nama: true } },
        parent: { select: { id: true } },
      },
    });
    if (!item) throw new NotFoundException('Kepengurusan tidak ditemukan');
    return item;
  }

  async create(data: {
    userId: string;
    jabatanId: string;
    periodeId: string;
    nasionalId?: string;
    distrikId?: string;
    wilayahId?: string;
    rantingId?: string;
    parentId?: string;
    startDate?: string;
    endDate?: string;
  }, scope?: UserScope) {
    // Validate user exists
    const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) throw new BadRequestException('User tidak ditemukan');

    // Validate jabatan exists
    const jabatan = await this.prisma.jabatan.findUnique({ where: { id: data.jabatanId } });
    if (!jabatan) throw new BadRequestException('Jabatan tidak ditemukan');

    // Validate periode exists
    const periode = await this.prisma.periode.findUnique({ where: { id: data.periodeId } });
    if (!periode) throw new BadRequestException('Periode tidak ditemukan');

    // Scope check: admin_distrik can only create within their distrik
    if (scope?.distrikId) {
      const targetDistrikId = data.distrikId ||
        (data.wilayahId ? (await this.prisma.wilayah.findUnique({ where: { id: data.wilayahId } }))?.distrikId : null) ||
        (data.rantingId ? (await this.prisma.ranting.findUnique({ where: { id: data.rantingId }, include: { wilayah: true } }))?.wilayah?.distrikId : null);
      if (targetDistrikId && targetDistrikId !== scope.distrikId) {
        throw new BadRequestException('Tidak memiliki akses ke distrik ini');
      }
    }

    // Check duplicate: same user + same unit + same period
    const existingWhere: Record<string, unknown> = {
      userId: data.userId,
      periodeId: data.periodeId,
    };
    if (data.distrikId) existingWhere.distrikId = data.distrikId;
    else if (data.wilayahId) existingWhere.wilayahId = data.wilayahId;
    else if (data.rantingId) existingWhere.rantingId = data.rantingId;

    const existing = await this.prisma.kepengurusan.findFirst({ where: existingWhere });
    if (existing) {
      throw new BadRequestException('User ini sudah menjabat di unit dan periode yang sama');
    }

    return this.prisma.kepengurusan.create({
      data: {
        userId: data.userId,
        jabatanId: data.jabatanId,
        periodeId: data.periodeId,
        nasionalId: data.nasionalId,
        distrikId: data.distrikId,
        wilayahId: data.wilayahId,
        rantingId: data.rantingId,
        parentId: data.parentId || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
      include: {
        user: { select: { namaLengkap: true } },
        jabatan: { select: { nama: true } },
        periode: { select: { nama: true } },
      },
    });
  }

  async update(id: string, data: {
    userId?: string;
    jabatanId?: string;
    parentId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }) {
    await this.findOne(id);

    if (data.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
      if (!user) throw new BadRequestException('User tidak ditemukan');
    }
    if (data.jabatanId) {
      const jabatan = await this.prisma.jabatan.findUnique({ where: { id: data.jabatanId } });
      if (!jabatan) throw new BadRequestException('Jabatan tidak ditemukan');
    }

    return this.prisma.kepengurusan.update({
      where: { id },
      data: {
        ...(data.userId && { userId: data.userId }),
        ...(data.jabatanId && { jabatanId: data.jabatanId }),
        parentId: data.parentId === undefined ? undefined : data.parentId,
        startDate: data.startDate === undefined ? undefined : data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate === undefined ? undefined : data.endDate ? new Date(data.endDate) : null,
      },
      include: {
        user: { select: { namaLengkap: true } },
        jabatan: { select: { nama: true } },
        periode: { select: { nama: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Check if has children
    const children = await this.prisma.kepengurusan.count({ where: { parentId: id } });
    if (children > 0) {
      throw new BadRequestException('Tidak bisa menghapus: masih ada bawahan yang terkait');
    }
    return this.prisma.kepengurusan.delete({ where: { id } });
  }

  /** Reparent a kepengurusan node (for drag-drop) */
  async reparent(id: string, parentId: string | null) {
    const item = await this.findOne(id);

    // Prevent circular reference
    if (parentId) {
      let current = parentId;
      while (current) {
        if (current === id) {
          throw new BadRequestException('Tidak bisa menjadikan bawahan sebagai atasan (circular reference)');
        }
        const parent = await this.prisma.kepengurusan.findUnique({
          where: { id: current },
          select: { parentId: true },
        });
        current = parent?.parentId || '';
      }
    }

    return this.prisma.kepengurusan.update({
      where: { id },
      data: { parentId },
      include: {
        user: { select: { namaLengkap: true } },
        jabatan: { select: { nama: true } },
      },
    });
  }

  /** Export kepengurusan to CSV-compatible rows */
  async exportCsv(filters?: {
    level?: string;
    unitId?: string;
    periodeId?: string;
    scope?: UserScope;
  }) {
    const items = await this.findAll(filters);
    return {
      headers: ['Nama', 'Jabatan', 'Periode', 'Level', 'Unit', 'Parent', 'Status', 'Tanggal Mulai', 'Tanggal Selesai'],
      rows: items.map((item) => ({
        nama: item.user.namaLengkap,
        jabatan: item.jabatan.nama,
        periode: item.periode.nama,
        level: item.rantingId ? 'Ranting' : item.wilayahId ? 'Wilayah' : item.distrikId ? 'Distrik' : 'Nasional',
        unit: item.ranting?.nama || item.wilayah?.nama || item.distrik?.nama || '-',
        parent: item.parent?.user?.namaLengkap || '-',
        status: item.endDate && new Date(item.endDate) < new Date() ? 'Selesai' : 'Aktif',
        startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '',
        endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '',
      })),
    };
  }

  /** Import kepengurusan from CSV rows */
  async importCsv(rows: Array<Record<string, string>>, scope?: UserScope) {
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const row of rows) {
      try {
        const nama = row['Nama'] || row['nama'];
        const jabatanNama = row['Jabatan'] || row['jabatan'];
        const periodeNama = row['Periode'] || row['periode'];
        const unitNama = row['Unit'] || row['unit'];
        const level = (row['Level'] || row['level'] || '').toLowerCase();

        if (!nama || !jabatanNama || !periodeNama) {
          results.errors.push(`Baris dilewati: nama/jabatan/periode kosong`);
          results.skipped++;
          continue;
        }

        // Find user by name
        const user = await this.prisma.user.findFirst({
          where: { namaLengkap: { contains: nama, mode: 'insensitive' } },
        });
        if (!user) {
          results.errors.push(`User "${nama}" tidak ditemukan`);
          results.skipped++;
          continue;
        }

        // Find jabatan
        const jabatan = await this.prisma.jabatan.findFirst({
          where: { nama: { contains: jabatanNama, mode: 'insensitive' } },
        });
        if (!jabatan) {
          results.errors.push(`Jabatan "${jabatanNama}" tidak ditemukan`);
          results.skipped++;
          continue;
        }

        // Find periode
        const periode = await this.prisma.periode.findFirst({
          where: { nama: { contains: periodeNama, mode: 'insensitive' } },
        });
        if (!periode) {
          results.errors.push(`Periode "${periodeNama}" tidak ditemukan`);
          results.skipped++;
          continue;
        }

        // Resolve unit
        let distrikId: string | undefined;
        let wilayahId: string | undefined;
        let rantingId: string | undefined;

        if (level === 'ranting' && unitNama) {
          const ranting = await this.prisma.ranting.findFirst({
            where: { nama: { contains: unitNama, mode: 'insensitive' } },
          });
          if (ranting) rantingId = ranting.id;
        } else if (level === 'wilayah' && unitNama) {
          const wilayah = await this.prisma.wilayah.findFirst({
            where: { nama: { contains: unitNama, mode: 'insensitive' } },
          });
          if (wilayah) wilayahId = wilayah.id;
        } else if (level === 'distrik' && unitNama) {
          const distrik = await this.prisma.distrik.findFirst({
            where: { nama: { contains: unitNama, mode: 'insensitive' } },
          });
          if (distrik) distrikId = distrik.id;
        }

        // Check duplicate
        const existingWhere: Record<string, unknown> = {
          userId: user.id,
          periodeId: periode.id,
        };
        if (distrikId) existingWhere.distrikId = distrikId;
        if (wilayahId) existingWhere.wilayahId = wilayahId;
        if (rantingId) existingWhere.rantingId = rantingId;

        const existing = await this.prisma.kepengurusan.findFirst({ where: existingWhere });
        if (existing) {
          results.skipped++;
          continue;
        }

        await this.prisma.kepengurusan.create({
          data: {
            userId: user.id,
            jabatanId: jabatan.id,
            periodeId: periode.id,
            distrikId: distrikId || null,
            wilayahId: wilayahId || null,
            rantingId: rantingId || null,
          },
        });
        results.created++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        results.errors.push(message);
        results.skipped++;
      }
    }

    return results;
  }
}
