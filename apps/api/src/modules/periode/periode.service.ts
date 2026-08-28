import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PeriodeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.periode.findMany({
      orderBy: { tglMulai: 'desc' },
      include: { _count: { select: { pengurus: true } } },
    });
  }

  async findOne(id: string) {
    const periode = await this.prisma.periode.findUnique({
      where: { id },
      include: { _count: { select: { pengurus: true } } },
    });
    if (!periode) throw new NotFoundException('Periode tidak ditemukan');
    return periode;
  }

  async create(data: { nama: string; tglMulai: string; tglSelesai: string; isActive?: boolean }) {
    // If setting as active, deactivate others
    if (data.isActive) {
      await this.prisma.periode.updateMany({ where: { isActive: true }, data: { isActive: false } });
    }
    return this.prisma.periode.create({
      data: {
        nama: data.nama,
        tglMulai: new Date(data.tglMulai),
        tglSelesai: new Date(data.tglSelesai),
        isActive: data.isActive ?? false,
      },
    });
  }

  async update(id: string, data: { nama?: string; tglMulai?: string; tglSelesai?: string; isActive?: boolean }) {
    await this.findOne(id);
    // If setting as active, deactivate others
    if (data.isActive) {
      await this.prisma.periode.updateMany({ where: { isActive: true, id: { not: id } }, data: { isActive: false } });
    }
    const updateData: Record<string, unknown> = {};
    if (data.nama !== undefined) updateData.nama = data.nama;
    if (data.tglMulai !== undefined) updateData.tglMulai = new Date(data.tglMulai);
    if (data.tglSelesai !== undefined) updateData.tglSelesai = new Date(data.tglSelesai);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    return this.prisma.periode.update({ where: { id }, data: updateData });
  }

  async remove(id: string) {
    const periode = await this.findOne(id);
    if (periode._count.pengurus > 0) {
      throw new ConflictException(`Periode "${periode.nama}" masih digunakan oleh ${periode._count.pengurus} pengurus`);
    }
    return this.prisma.periode.delete({ where: { id } });
  }
}
