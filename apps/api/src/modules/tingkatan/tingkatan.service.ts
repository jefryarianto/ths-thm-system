import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateTingkatanDto, UpdateTingkatanDto } from './dto/tingkatan.dto';

@Injectable()
export class TingkatanService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTingkatanDto: CreateTingkatanDto) {
    // Check if kode already exists
    const existing = await this.prisma.tingkatan.findUnique({
      where: { kodeTingkat: createTingkatanDto.kodeTingkat },
    });

    if (existing) {
      throw new NotFoundException(`Tingkatan dengan kode ${createTingkatanDto.kodeTingkat} sudah ada`);
    }

    return this.prisma.tingkatan.create({
      data: createTingkatanDto,
    });
  }

  async findAll(filters?: { statusAktif?: boolean }) {
    const where: any = {};

    if (filters?.statusAktif !== undefined) {
      where.statusAktif = filters.statusAktif;
    }

    return this.prisma.tingkatan.findMany({
      where,
      orderBy: { urutan: 'asc' },
    });
  }

  async findOne(id: string) {
    const tingkatan = await this.prisma.tingkatan.findUnique({
      where: { id },
    });

    if (!tingkatan) {
      throw new NotFoundException(`Tingkatan with ID ${id} not found`);
    }

    return tingkatan;
  }

  async update(id: string, updateTingkatanDto: UpdateTingkatanDto) {
    // Check if tingkatan exists
    const existing = await this.prisma.tingkatan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Tingkatan with ID ${id} not found`);
    }

    // Check if kodeTingkat is being updated and if it already exists
    if (updateTingkatanDto.kodeTingkat && updateTingkatanDto.kodeTingkat !== existing.kodeTingkat) {
      const kodeExists = await this.prisma.tingkatan.findUnique({
        where: { kodeTingkat: updateTingkatanDto.kodeTingkat },
      });

      if (kodeExists) {
        throw new NotFoundException(`Tingkatan dengan kode ${updateTingkatanDto.kodeTingkat} sudah ada`);
      }
    }

    return this.prisma.tingkatan.update({
      where: { id },
      data: updateTingkatanDto,
    });
  }

  async remove(id: string) {
    // Check if tingkatan exists
    const existing = await this.prisma.tingkatan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Tingkatan with ID ${id} not found`);
    }

    // Soft delete by setting statusAktif to false
    return this.prisma.tingkatan.update({
      where: { id },
      data: { statusAktif: false },
    });
  }

  async findActive() {
    return this.prisma.tingkatan.findMany({
      where: { statusAktif: true },
      orderBy: { urutan: 'asc' },
    });
  }
}
