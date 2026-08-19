import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getBerita() {
    return this.prisma.berita.findMany({
      where: { isVisible: true },
      orderBy: { tanggal: 'desc' },
    });
  }

  async getGaleri() {
    return this.prisma.galeri.findMany({
      where: { isVisible: true },
      orderBy: { tanggal: 'desc' },
    });
  }

  async getDonasiProgram() {
    return this.prisma.donasiProgram.findMany({
      where: { isVisible: true },
    });
  }

  async getSejarah() {
    return this.prisma.sejarah.findFirst({
      where: { isVisible: true },
    });
  }

  async getSambutan() {
    return this.prisma.sambutan.findFirst({
      where: { isVisible: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBeranda() {
    const [sambutan, berita, donasi] = await Promise.all([
      this.getSambutan(),
      this.prisma.berita.findMany({
        where: { isVisible: true },
        orderBy: { tanggal: 'desc' },
        take: 3,
      }),
      this.prisma.donasiProgram.findMany({
        where: { isVisible: true },
        take: 3,
      }),
    ]);

    return {
      sambutan,
      berita,
      donasi,
    };
  }

  async getOrganisasi() {
    return this.prisma.organisasi.findFirst({
      where: { isVisible: true },
    });
  }

  async getBankInfo() {
    return this.prisma.bankInfo.findMany({
      where: { isActive: true },
      orderBy: { bankName: 'asc' },
    });
  }

  async getKepengurusan() {
    return this.prisma.kepengurusan.findMany({
      where: {
        periode: { isActive: true },
      },
      include: {
        user: { select: { namaLengkap: true } },
        jabatan: { select: { nama: true, urutan: true } },
        periode: { select: { nama: true } },
        nasional: { select: { nama: true } },
        distrik: { select: { nama: true } },
        wilayah: { select: { nama: true } },
        ranting: { select: { nama: true } },
      },
      orderBy: {
        jabatan: { urutan: 'asc' },
      },
    });
  }
}
