import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { ApprovalService } from '../approvals/approval.service';

@Injectable()
export class ContentService {
  private readonly BERITA_CACHE_KEY = 'content:berita:all';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly approvalService: ApprovalService,
  ) {}

  // ── Berita CRUD ──

  async getAllBerita() {
    return this.cache.getOrSet(
      this.BERITA_CACHE_KEY,
      () =>
        this.prisma.berita.findMany({
          orderBy: { tanggal: 'desc' },
        }),
      300_000, // 5 minutes cache
    );
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
  submittedBy?: string; // User yang submit
}) {
  const berita = await this.prisma.berita.create({
    data: {
      judul: data.judul,
      ringkasan: data.ringkasan,
      konten: data.konten,
      gambar: data.gambar || null,
      slug: data.slug,
      isVisible: data.isVisible ?? (await this.shouldAutoApprove(data.submittedBy)),
    },
  });
  
  // Jika tidak auto-visible dan ada submittedBy, buat approval request
  if (data.isVisible === false && data.submittedBy) {
    await this.approvalService.submitBeritaForApproval(berita.id, data.submittedBy);
  }
  
  this.cache.del(this.BERITA_CACHE_KEY);
  return berita;
}

private async shouldAutoApprove(userId: string | undefined): Promise<boolean> {
  if (!userId) return true; // Sistem/Admin tanpa user ID langsung approved
  
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  
  if (!user) return false;
  
  // Cek apakah user memiliki role admin
  return (
    user.role === 'superadmin' ||
    user.role === 'admin_distrik' ||
    user.role === 'admin_wilayah' ||
    user.role === 'admin_ranting' ||
    user.role === 'admin_kegiatan'
  );
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
    const updated = await this.prisma.berita.update({
      where: { id },
      data,
    });
    this.cache.del(this.BERITA_CACHE_KEY);
    this.cache.del(`content:berita:${id}`);
    return updated;
  }

  async deleteBerita(id: string) {
    await this.getBeritaById(id);
    const deleted = await this.prisma.berita.delete({ where: { id } });
    this.cache.del(this.BERITA_CACHE_KEY);
    this.cache.del(`content:berita:${id}`);
    return deleted;
  }
}
