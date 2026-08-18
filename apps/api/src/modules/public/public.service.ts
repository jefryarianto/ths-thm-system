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
}
