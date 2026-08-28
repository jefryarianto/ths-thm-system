import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KepengurusanService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: { level?: string; unitId?: string; periodeId?: string }) {
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
  }) {
    // Validate user exists
    const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) throw new BadRequestException('User tidak ditemukan');

    // Validate jabatan exists
    const jabatan = await this.prisma.jabatan.findUnique({ where: { id: data.jabatanId } });
    if (!jabatan) throw new BadRequestException('Jabatan tidak ditemukan');

    // Validate periode exists
    const periode = await this.prisma.periode.findUnique({ where: { id: data.periodeId } });
    if (!periode) throw new BadRequestException('Periode tidak ditemukan');

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
}
