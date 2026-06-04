import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrgDocumentDto, UpdateOrgDocumentDto, OrgDocumentFilterDto, CreateCategoryDto, UpdateCategoryDto } from './dto/org-document.dto';

@Injectable()
export class OrgDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
