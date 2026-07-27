import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import { MailService } from '../../mail/mail.service';
import {
  CreateOrgDocumentDto,
  UpdateOrgDocumentDto,
  OrgDocumentFilterDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/org-document.dto';

@Injectable()
export class OrgDocumentsService extends BaseCrudService<CreateOrgDocumentDto, UpdateOrgDocumentDto> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scopeHelper: ScopeHelper,
    protected readonly cache: CacheService,
    private readonly mailService: MailService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'dokumenOrganisasi',
      prefix: 'org-documents:',
      notFound: 'Dokumen tidak ditemukan',
    });
  }

  // ── Hook: notify admins after create ─────────────────

  protected async afterCreate(
    result: any,
    dto: CreateOrgDocumentDto,
  ): Promise<void> {
    this.notifyAdminsNewDocument(dto.judul || 'Dokumen Baru');
  }

  // ── CRUD Overrides ──────────────────────────────────

  async findAll(query: OrgDocumentFilterDto) {
    const cacheKey = `${this.CACHE_PREFIX}list:${query.page || 1}:${query.limit || 10}:${query.kategoriId || ''}:${query.search || ''}`;

    return this.baseFindAll(
      cacheKey,
      async () => {
        const where: Record<string, unknown> = {};
        if (query.kategoriId) where.kategoriId = query.kategoriId;
        if (query.search) where.judul = { contains: query.search };
        return where;
      },
      {
        page: query.page,
        limit: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { kategori: true, uploader: { select: { id: true, namaLengkap: true } } },
      },
      30,
    );
  }

  async findOne(id: string) {
    return this.baseFindOne(id, undefined, {
      kategori: true,
    });
  }

  async create(dto: CreateOrgDocumentDto) {
    return this.baseCreate(dto, undefined, undefined, 'Dokumen berhasil diupload');
  }

  async update(id: string, dto: UpdateOrgDocumentDto) {
    return this.baseUpdate(id, dto, undefined, 'Dokumen berhasil diperbarui');
  }

  async remove(id: string) {
    return this.baseRemove(id, undefined, 'Dokumen berhasil dihapus');
  }

  // ── Domain: Categories ──────────────────────────────

  async getCategories() {
    const categories = await (this.prisma as any).kategoriDokumen.findMany({
      include: { _count: { select: { dokumen: true } } },
    });
    return { data: categories };
  }

  async getCategory(id: string) {
    const cat = await (this.prisma as any).kategoriDokumen.findUnique({
      where: { id },
    });
    if (!cat) throw new NotFoundException('Kategori tidak ditemukan');
    return { data: cat };
  }

  async createCategory(dto: CreateCategoryDto) {
    const cat = await (this.prisma as any).kategoriDokumen.create({
      data: dto as any,
    });
    return { data: cat, message: 'Kategori berhasil dibuat' };
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const cat = await (this.prisma as any).kategoriDokumen.update({
      where: { id },
      data: dto as Record<string, unknown>,
    });
    return { data: cat, message: 'Kategori berhasil diperbarui' };
  }

  async deleteCategory(id: string) {
    await (this.prisma as any).kategoriDokumen.delete({ where: { id } });
    return { message: 'Kategori berhasil dihapus' };
  }

  // ── Private Helpers ─────────────────────────────────

  private async notifyAdminsNewDocument(judul: string): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const admins = await (this.prisma as any).user.findMany({
        where: {
          role: { in: ['superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting'] },
          isActive: true,
        },
        select: { email: true, namaLengkap: true },
      });

      for (const admin of admins) {
        if (!admin.email) continue;
        await this.mailService.sendMail({
          to: admin.email,
          subject: `Dokumen Organisasi Baru — ${judul}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1a56db;">📁 Dokumen Organisasi Baru</h2>
              <p>Halo <strong>${admin.namaLengkap}</strong>,</p>
              <p>Dokumen organisasi baru telah diupload:</p>
              <p style="font-size: 16px; font-weight: bold; margin: 16px 0;">${judul}</p>
              <p>Silakan login ke aplikasi untuk melihat dan mengelola dokumen.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #6b7280; font-size: 12px;">
                THS-THM System &mdash; Notifikasi dokumen organisasi
              </p>
            </div>
          `,
          metadata: { module: 'org-documents', template: 'orgDocumentNotificationEmail' },
        });
      }
    } catch (error) {
      this.logger.error(`notifyAdminsNewDocument failed: ${(error as Error).message}`);
    }
  }
}
