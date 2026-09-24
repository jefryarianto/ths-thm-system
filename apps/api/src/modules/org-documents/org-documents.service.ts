import { Prisma } from '@prisma/client';
import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import { MailService } from '../../mail/mail.service';
import { orgDocumentNotificationEmail } from '../../mail/email-templates';
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
    @Optional() protected readonly persistentAudit?: PersistentAuditService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'dokumenOrganisasi',
      prefix: 'org-documents:',
      notFound: 'Dokumen tidak ditemukan',
    }, persistentAudit);
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
        if (query.search) where.judul = { contains: query.search, mode: 'insensitive' };
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
    return this.prisma.kategoriDokumen.findMany({
      include: { _count: { select: { dokumen: true } } },
    });
  }

  async getCategory(id: string) {
    const cat = await this.prisma.kategoriDokumen.findUnique({
      where: { id },
    });
    if (!cat) throw new NotFoundException('Kategori tidak ditemukan');
    return cat;
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.kategoriDokumen.create({
      data: dto as Prisma.KategoriDokumenCreateInput,
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    return this.prisma.kategoriDokumen.update({
      where: { id },
      data: dto as Record<string, unknown>,
    });
  }

  async deleteCategory(id: string) {
    await this.prisma.kategoriDokumen.delete({ where: { id } });
  }

  // ── Private Helpers ─────────────────────────────────

  private async notifyAdminsNewDocument(judul: string): Promise<void> {
    try {
      const admins = await this.prisma.user.findMany({
        where: {
          role: { in: ['superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting'] },
          isActive: true,
        },
        select: { email: true, namaLengkap: true },
      });

      for (const admin of admins) {
        if (!admin.email) continue;
        const tpl = orgDocumentNotificationEmail(admin.namaLengkap, judul);
        await this.mailService.sendMail({
          to: admin.email,
          subject: tpl.subject,
          html: tpl.html,
          metadata: { module: 'org-documents', template: 'orgDocumentNotificationEmail' },
        });
      }
    } catch (error) {
      this.logger.error(`notifyAdminsNewDocument failed: ${(error as Error).message}`);
    }
  }
}
