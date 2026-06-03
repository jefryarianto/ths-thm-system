import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.setting.findMany();
    return { success: true, data: settings };
  }

  async updateSettings(dto: any) {
    for (const [key, value] of Object.entries(dto)) {
      await this.prisma.setting.upsert({ where: { key }, update: { value: value as any }, create: { key, value: value as any } });
    }
    return { success: true, message: 'Konfigurasi berhasil diperbarui' };
  }

  async getPeriods() {
    const periods = await this.prisma.periode.findMany({ orderBy: { tglMulai: 'desc' } });
    return { success: true, data: periods };
  }

  async getPeriod(id: string) {
    const period = await this.prisma.periode.findUnique({ where: { id } });
    if (!period) throw new NotFoundException('Periode tidak ditemukan');
    return { success: true, data: period };
  }

  async createPeriod(dto: any) {
    const period = await this.prisma.periode.create({ data: dto });
    return { success: true, data: period, message: 'Periode berhasil dibuat' };
  }

  async updatePeriod(id: string, dto: any) {
    const period = await this.prisma.periode.update({ where: { id }, data: dto });
    return { success: true, data: period, message: 'Periode berhasil diperbarui' };
  }

  async deletePeriod(id: string) {
    await this.prisma.periode.delete({ where: { id } });
    return { success: true, message: 'Periode berhasil dihapus' };
  }

  async getRoles() {
    return {
      success: true,
      data: [
        { role: 'superadmin', label: 'Super Admin', permissions: ['*'] },
        { role: 'admin_distrik', label: 'Admin Distrik', permissions: ['members', 'candidates', 'trainings', 'graduations', 'reports'] },
        { role: 'admin_wilayah', label: 'Admin Wilayah', permissions: ['members', 'candidates', 'trainings', 'reports'] },
        { role: 'admin_ranting', label: 'Admin Ranting', permissions: ['members', 'candidates'] },
        { role: 'admin_kegiatan', label: 'Admin Kegiatan', permissions: ['trainings', 'graduations', 'activities'] },
        { role: 'penguji', label: 'Penguji', permissions: ['assessments'] },
        { role: 'anggota', label: 'Anggota', permissions: ['profile', 'documents', 'dues'] },
      ],
    };
  }

  async uploadSignature(dto: any) {
    const sig = await this.prisma.tandaTangan.create({ data: dto });
    return { success: true, data: sig, message: 'Tanda tangan berhasil diupload' };
  }

  async getSignatures() {
    const sigs = await this.prisma.tandaTangan.findMany({ include: { user: { select: { namaLengkap: true } } } });
    return { success: true, data: sigs };
  }

  async deleteSignature(id: string) {
    await this.prisma.tandaTangan.delete({ where: { id } });
    return { success: true, message: 'Tanda tangan berhasil dihapus' };
  }

  async uploadStamp(dto: any) {
    const stamp = await this.prisma.stempel.create({ data: dto });
    return { success: true, data: stamp, message: 'Stempel berhasil diupload' };
  }

  async getStamp() {
    const stamp = await this.prisma.stempel.findFirst({ where: { isActive: true } });
    return { success: true, data: stamp };
  }
}