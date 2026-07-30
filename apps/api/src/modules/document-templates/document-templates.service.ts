import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDocumentTemplateDto, UpdateDocumentTemplateDto } from './dto/document-template.dto';

@Injectable()
export class DocumentTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(type?: string) {
    const where: Record<string, unknown> = { isActive: true };
    if (type) {
      where.type = type as any;
    }
    return this.prisma.documentTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException('Template tidak ditemukan');
    }
    return template;
  }

  async create(dto: CreateDocumentTemplateDto) {
    // Validate file path exists (in production, check actual file)
    if (!dto.filePath) {
      throw new BadRequestException('File path harus diisi');
    }

    // If this is set as default, unset other defaults for same type
    if (dto.isDefault) {
      await this.prisma.documentTemplate.updateMany({
        where: { type: dto.type as any, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.documentTemplate.create({
      data: {
        name: dto.name,
        type: dto.type as any,
        description: dto.description,
        filePath: dto.filePath,
        thumbnailPath: dto.thumbnailPath,
        variables: dto.variables || [],
        isActive: dto.isActive ?? true,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateDocumentTemplateDto) {
    const existing = await this.findOne(id);

    // If setting as default, unset other defaults for same type
    if (dto.isDefault && !existing.isDefault) {
      await this.prisma.documentTemplate.updateMany({
        where: { type: existing.type, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.documentTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const template = await this.findOne(id);
    
    // Don't allow deleting the last default template for a type
    if (template.isDefault) {
      const otherDefaults = await this.prisma.documentTemplate.count({
        where: { type: template.type, isDefault: true, id: { not: id } },
      });
      if (otherDefaults === 0) {
        throw new BadRequestException('Tidak dapat menghapus template default. Set template lain sebagai default terlebih dahulu.');
      }
    }

    return this.prisma.documentTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getDefaultByType(type: string) {
    const template = await this.prisma.documentTemplate.findFirst({
      where: { type: type as any, isDefault: true, isActive: true },
    });
    return template;
  }

  async getByType(type: string) {
    return this.prisma.documentTemplate.findMany({
      where: { type: type as any, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
