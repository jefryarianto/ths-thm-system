import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePenandatanganDto, UpdatePenandatanganDto } from './dto/penandatangan.dto';

@Injectable()
export class PenandatanganService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.penandatangan.findMany({
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  /** Penandatangan aktif yang dipakai pada kartu/sertifikat. */
  async findActive() {
    return this.prisma.penandatangan.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(dto: CreatePenandatanganDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isActive) {
        // Pastikan hanya satu penandatangan aktif
        await tx.penandatangan.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }
      return tx.penandatangan.create({
        data: { nama: dto.nama, jabatan: dto.jabatan, isActive: dto.isActive ?? false },
      });
    });
  }

  async update(id: string, dto: UpdatePenandatanganDto) {
    const existing = await this.prisma.penandatangan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Penandatangan tidak ditemukan');

    return this.prisma.$transaction(async (tx) => {
      if (dto.isActive) {
        await tx.penandatangan.updateMany({
          where: { id: { not: id }, isActive: true },
          data: { isActive: false },
        });
      }

      return tx.penandatangan.update({
        where: { id },
        data: {
          ...(dto.nama !== undefined && { nama: dto.nama }),
          ...(dto.jabatan !== undefined && { jabatan: dto.jabatan }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.penandatangan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Penandatangan tidak ditemukan');
    if (existing.isActive) {
      throw new BadRequestException('Penandatangan aktif tidak dapat dihapus. Nonaktifkan dulu atau pilih penandatangan aktif lainnya.');
    }

    await this.prisma.penandatangan.delete({ where: { id } });
    return { deleted: true };
  }
}
