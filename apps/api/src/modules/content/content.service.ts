import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Berita CRUD ──

  async getAllBerita() {
    return this.prisma.berita.findMany({
      orderBy: { tanggal: 'desc' },
    });
  }

  async getBeritaById(id: string) {
    const berita = await this.prisma.berita.findUnique({ where: { id } });
    if (!berita) throw new NotFoundException('Berita tidak ditemukan');
    return berita;
  }

  async createBerita(data: {
    judul: string;
    ringkasan: string;
    konten: string;
    gambar?: string;
    slug: string;
    isVisible?: boolean;
  }) {
    return this.prisma.berita.create({
      data: {
        judul: data.judul,
        ringkasan: data.ringkasan,
        konten: data.konten,
        gambar: data.gambar || null,
        slug: data.slug,
        isVisible: data.isVisible ?? true,
      },
    });
  }

  async updateBerita(
    id: string,
    data: {
      judul?: string;
      ringkasan?: string;
      konten?: string;
      gambar?: string;
      slug?: string;
      isVisible?: boolean;
    },
  ) {
    await this.getBeritaById(id);
    return this.prisma.berita.update({
      where: { id },
      data,
    });
  }

  async deleteBerita(id: string) {
    await this.getBeritaById(id);
    return this.prisma.berita.delete({ where: { id } });
  }
}
