import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { CreateOrgDocumentDto, UpdateOrgDocumentDto, OrgDocumentFilterDto, CreateCategoryDto, UpdateCategoryDto } from './dto/org-document.dto';

@Injectable()
export class OrgDocumentsService {
  private readonly logger = new Logger(OrgDocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async findAll(query: OrgDocumentFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const where: Record<string, unknown> = {};
    if (query.kategoriId) where.kategoriId = query.kategoriId;
    if (query.search) where.judul = { contains: query.search };

    const [data, total] = await Promise.all([
      this.prisma.dokumenOrganisasi.findMany({ where, skip: (page - 1) * limit, take: limit, include: { kategori: true, uploader: { select: { id: true, namaLengkap: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.dokumenOrganisasi.count({ where }),
    ]);
    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const doc = await this.prisma.dokumenOrganisasi.findUnique({ where: { id }, include: { kategori: true } });
    if (!doc) throw new NotFoundException('Dokumen tidak ditemukan');
    return { success: true, data: doc };
  }

  async create(dto: CreateOrgDocumentDto) {
    const doc = await this.prisma.dokumenOrganisasi.create({ data: dto as never });

    // Notify admins about new org document (method handles errors internally)
    this.notifyAdminsNewDocument(dto.judul || 'Dokumen Baru');

    return { success: true, data: doc, message: 'Dokumen berhasil diupload' };
  }

  async update(id: string, dto: UpdateOrgDocumentDto) {
    const doc = await this.prisma.dokumenOrganisasi.update({ where: { id }, data: dto });
    return { success: true, data: doc, message: 'Dokumen berhasil diperbarui' };
  }

  async remove(id: string) {
    await this.prisma.dokumenOrganisasi.delete({ where: { id } });
    return { success: true, message: 'Dokumen berhasil dihapus' };
  }

  async getCategories() {
    const categories = await this.prisma.kategoriDokumen.findMany({ include: { _count: { select: { dokumen: true } } } });
    return { success: true, data: categories };
  }

  async createCategory(dto: CreateCategoryDto) {
    const cat = await this.prisma.kategoriDokumen.create({ data: dto });
    return { success: true, data: cat, message: 'Kategori berhasil dibuat' };
  }

  async getCategory(id: string) {
    const cat = await this.prisma.kategoriDokumen.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Kategori tidak ditemukan');
    return { success: true, data: cat };
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.kategoriDokumen.update({ where: { id }, data: dto });
    return { success: true, data: cat, message: 'Kategori berhasil diperbarui' };
  }

  async deleteCategory(id: string) {
    await this.prisma.kategoriDokumen.delete({ where: { id } });
    return { success: true, message: 'Kategori berhasil dihapus' };
  }

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
