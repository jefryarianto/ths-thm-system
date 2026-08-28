import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JabatanService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.jabatan.findMany({
      orderBy: { urutan: 'asc' },
      include: { _count: { select: { pengurus: true } } },
    });
  }

  async findOne(id: string) {
    const jabatan = await this.prisma.jabatan.findUnique({
      where: { id },
      include: { _count: { select: { pengurus: true } } },
    });
    if (!jabatan) throw new NotFoundException('Jabatan tidak ditemukan');
    return jabatan;
  }

  async create(data: { nama: string; kode?: string; urutan?: number }) {
    const existing = await this.prisma.jabatan.findUnique({ where: { nama: data.nama } });
    if (existing) throw new ConflictException(`Jabatan "${data.nama}" sudah ada`);
    return this.prisma.jabatan.create({ data });
  }

  async update(id: string, data: { nama?: string; kode?: string; urutan?: number }) {
    await this.findOne(id);
    return this.prisma.jabatan.update({ where: { id }, data });
  }

  async remove(id: string) {
    const jabatan = await this.findOne(id);
    if (jabatan._count.pengurus > 0) {
      throw new ConflictException(`Jabatan "${jabatan.nama}" masih digunakan oleh ${jabatan._count.pengurus} pengurus`);
    }
    return this.prisma.jabatan.delete({ where: { id } });
  }
}
