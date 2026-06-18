import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDistrikDto,
  UpdateDistrikDto,
  CreateWilayahDto,
  UpdateWilayahDto,
  CreateRantingDto,
  UpdateRantingDto,
} from './dto/org-structure.dto';

@Injectable()
export class OrgStructureService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── DISTRIK ───

  async getAllDistrik() {
    const data = await this.prisma.distrik.findMany({
      orderBy: { nama: 'asc' },
      include: { _count: { select: { wilayahs: true } } },
    });
    return { success: true, data };
  }

  async getDistrik(id: string) {
    const data = await this.prisma.distrik.findUnique({
      where: { id },
      include: {
        wilayahs: {
          include: { _count: { select: { rantings: true } } },
          orderBy: { nama: 'asc' },
        },
        _count: { select: { wilayahs: true } },
      },
    });
    if (!data) throw new NotFoundException('Distrik tidak ditemukan');
    return { success: true, data };
  }

  async createDistrik(dto: CreateDistrikDto) {
    const nasional = await this.prisma.nasional.findFirst();
    const data = await this.prisma.distrik.create({
      data: {
        kodeDistrik: dto.kodeDistrik,
        nama: dto.nama,
        alamat: dto.alamat,
        nasionalId: dto.nasionalId || nasional?.id || 'seed',
      },
    });
    return { success: true, data, message: 'Distrik berhasil ditambahkan' };
  }

  async updateDistrik(id: string, dto: UpdateDistrikDto) {
    const existing = await this.prisma.distrik.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Distrik tidak ditemukan');

    const data = await this.prisma.distrik.update({ where: { id }, data: dto });
    return { success: true, data, message: 'Distrik berhasil diperbarui' };
  }

  async deleteDistrik(id: string) {
    const existing = await this.prisma.distrik.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Distrik tidak ditemukan');

    await this.prisma.distrik.delete({ where: { id } });
    return { success: true, message: 'Distrik berhasil dihapus' };
  }

  // ─── WILAYAH ───

  async getAllWilayah(distrikId?: string) {
    const where = distrikId ? { distrikId } : {};
    const data = await this.prisma.wilayah.findMany({
      where,
      orderBy: { nama: 'asc' },
      include: {
        distrik: { select: { id: true, nama: true } },
        _count: { select: { rantings: true } },
      },
    });
    return { success: true, data };
  }

  async getWilayah(id: string) {
    const data = await this.prisma.wilayah.findUnique({
      where: { id },
      include: {
        distrik: { select: { id: true, nama: true } },
        rantings: {
          include: { _count: { select: { anggota: true } } },
          orderBy: { nama: 'asc' },
        },
      },
    });
    if (!data) throw new NotFoundException('Wilayah tidak ditemukan');
    return { success: true, data };
  }

  async createWilayah(dto: CreateWilayahDto) {
    const data = await this.prisma.wilayah.create({ data: dto });
    return { success: true, data, message: 'Wilayah berhasil ditambahkan' };
  }

  async updateWilayah(id: string, dto: UpdateWilayahDto) {
    const existing = await this.prisma.wilayah.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Wilayah tidak ditemukan');

    const data = await this.prisma.wilayah.update({ where: { id }, data: dto });
    return { success: true, data, message: 'Wilayah berhasil diperbarui' };
  }

  async deleteWilayah(id: string) {
    const existing = await this.prisma.wilayah.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Wilayah tidak ditemukan');

    await this.prisma.wilayah.delete({ where: { id } });
    return { success: true, message: 'Wilayah berhasil dihapus' };
  }

  // ─── RANTING ───

  async getAllRanting(wilayahId?: string) {
    const where = wilayahId ? { wilayahId } : {};
    const data = await this.prisma.ranting.findMany({
      where,
      orderBy: { nama: 'asc' },
      include: {
        wilayah: { select: { id: true, nama: true, distrik: { select: { id: true, nama: true } } } },
        _count: { select: { anggota: true } },
      },
    });
    return { success: true, data };
  }

  async getRanting(id: string) {
    const data = await this.prisma.ranting.findUnique({
      where: { id },
      include: {
        wilayah: { select: { id: true, nama: true, distrik: { select: { id: true, nama: true } } } },
        _count: { select: { anggota: true, calonAnggotas: true } },
      },
    });
    if (!data) throw new NotFoundException('Ranting tidak ditemukan');
    return { success: true, data };
  }

  async createRanting(dto: CreateRantingDto) {
    const data = await this.prisma.ranting.create({ data: dto });
    return { success: true, data, message: 'Ranting berhasil ditambahkan' };
  }

  async updateRanting(id: string, dto: UpdateRantingDto) {
    const existing = await this.prisma.ranting.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ranting tidak ditemukan');

    const data = await this.prisma.ranting.update({ where: { id }, data: dto });
    return { success: true, data, message: 'Ranting berhasil diperbarui' };
  }

  async deleteRanting(id: string) {
    const existing = await this.prisma.ranting.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ranting tidak ditemukan');

    await this.prisma.ranting.delete({ where: { id } });
    return { success: true, message: 'Ranting berhasil dihapus' };
  }

  // ─── ORGANIZATION TREE ───

  async getOrgTree() {
    const data = await this.prisma.distrik.findMany({
      orderBy: { nama: 'asc' },
      include: {
        wilayahs: {
          orderBy: { nama: 'asc' },
          include: {
            rantings: {
              orderBy: { nama: 'asc' },
              include: { _count: { select: { anggota: true } } },
            },
          },
        },
      },
    });
    return { success: true, data };
  }
}
