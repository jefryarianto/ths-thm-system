import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAspectDto,
  UpdateAspectDto,
  CreateItemDto,
  UpdateItemDto,
  CreateScoreDto,
  ScoreFilterDto,
  AssessmentFilterDto,
} from './dto/assessment.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { paginate } from '../../common/utils/pagination';

export interface ImportRow {
  no: number;
  aspek: string;
  item: string;
  deskripsi?: string;
}

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
  ) {}

  async getAspects(_query: AssessmentFilterDto) {
    const data = await this.prisma.aspekPenilaian.findMany({ include: { itemPenilaian: true } });
    return { success: true, data };
  }

  async getAspect(id: string) {
    const aspect = await this.prisma.aspekPenilaian.findUnique({
      where: { id },
      include: { itemPenilaian: true },
    });
    if (!aspect) throw new NotFoundException('Aspek tidak ditemukan');
    return { success: true, data: aspect };
  }

  async createAspect(dto: CreateAspectDto) {
    const aspect = await this.prisma.aspekPenilaian.create({ data: dto });
    return { success: true, data: aspect, message: 'Aspek penilaian berhasil dibuat' };
  }

  async updateAspect(id: string, dto: UpdateAspectDto) {
    const aspect = await this.prisma.aspekPenilaian.update({ where: { id }, data: dto });
    return { success: true, data: aspect, message: 'Aspek penilaian diperbarui' };
  }

  async deleteAspect(id: string) {
    await this.prisma.aspekPenilaian.update({ where: { id }, data: { isActive: false } });
    return { success: true, message: 'Aspek penilaian dinonaktifkan' };
  }

  async getItems(query: AssessmentFilterDto) {
    const where: Record<string, unknown> = {};
    if (query.aspekId) where.aspekId = query.aspekId;
    const data = await this.prisma.itemPenilaian.findMany({
      where,
      include: { aspek: true },
      orderBy: { urutan: 'asc' },
    });
    return { success: true, data };
  }

  async getItem(id: string) {
    const item = await this.prisma.itemPenilaian.findUnique({
      where: { id },
      include: { aspek: true },
    });
    if (!item) throw new NotFoundException('Item tidak ditemukan');
    return { success: true, data: item };
  }

  async createItem(dto: CreateItemDto) {
    const item = await this.prisma.itemPenilaian.create({ data: dto as never });
    return { success: true, data: item, message: 'Item penilaian berhasil dibuat' };
  }

  async updateItem(id: string, dto: UpdateItemDto) {
    const item = await this.prisma.itemPenilaian.update({ where: { id }, data: dto });
    return { success: true, data: item, message: 'Item penilaian diperbarui' };
  }

  async deleteItem(id: string) {
    await this.prisma.itemPenilaian.update({ where: { id }, data: { isActive: false } });
    return { success: true, message: 'Item penilaian dinonaktifkan' };
  }

  // ── Import Aspek & Item dari List ──

  async importFromList(data: ImportRow[]) {
    if (!data || data.length === 0) {
      return { success: true, data: { importedAspects: 0, importedItems: 0, total: 0 } };
    }

    // Group by aspek name
    const aspekMap = new Map<string, ImportRow[]>();
    for (const row of data) {
      const key = row.aspek.trim().toUpperCase();
      if (!aspekMap.has(key)) {
        aspekMap.set(key, []);
      }
      aspekMap.get(key)!.push(row);
    }

    let importedAspects = 0;
    let importedItems = 0;

    for (const [aspekName, rows] of aspekMap) {
      // Generate kode aspek from first row's no
      const no = rows[0].no;
      const kodeAspek = `A${String(no).padStart(2, '0')}`;

      // Check if aspek already exists
      let aspek = await this.prisma.aspekPenilaian.findUnique({
        where: { kodeAspek },
      });

      if (!aspek) {
        // Create new aspek
        const bobot = Math.round(100 / aspekMap.size);
        aspek = await this.prisma.aspekPenilaian.create({
          data: {
            kodeAspek,
            namaAspek: aspekName,
            bobot,
            deskripsi: `Aspek ${aspekName}`,
          },
        });
        importedAspects++;
      }

      // Create items for this aspek
      let urutan = 1;
      for (const row of rows) {
        const kodeItem = `I${String(no).padStart(2, '0')}${String(urutan).padStart(2, '0')}`;

        // Check if item already exists
        const existing = await this.prisma.itemPenilaian.findUnique({
          where: { kodeItem },
        });

        if (!existing) {
          await this.prisma.itemPenilaian.create({
            data: {
              aspekId: aspek.id,
              kodeItem,
              namaItem: row.item.trim(),
              skorMaksimal: 100,
              bobot: 1,
              urutan,
              isActive: true,
            },
          });
          importedItems++;
        }
        urutan++;
      }
    }

    this.logger.log(`Import completed: ${importedAspects} aspects, ${importedItems} items`);

    return {
      success: true,
      data: {
        importedAspects,
        importedItems,
        total: data.length,
      },
      message: `Berhasil import ${importedAspects} aspek dan ${importedItems} item penilaian`,
    };
  }

  // ── Import dari CSV (parse dulu di controller) ──

  async importFromCsvText(csvText: string) {
    // Parse CSV text manually (format: NO,ASPEK,ITEM,DESKRIPSI)
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      return { success: true, data: { importedAspects: 0, importedItems: 0, total: 0 } };
    }

    // Skip header line, parse data
    const data: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line (simple parser, handle quoted values)
      const values = this.parseCsvLine(line);
      if (values.length >= 3) {
        data.push({
          no: parseInt(values[0], 10) || 0,
          aspek: values[1].trim(),
          item: values[2].trim(),
          deskripsi: values[3]?.trim() || '',
        });
      }
    }

    return this.importFromList(data);
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  // ── Existing methods ──

  async getScores(query: ScoreFilterDto, scope?: UserScope) {
    const where: Record<string, unknown> = {};
    if (query.calonAnggotaId) where.calonAnggotaId = query.calonAnggotaId;

    // When a specific kegiatanId is provided, verify scope access on that kegiatan
    if (query.kegiatanId) {
      const kegiatan = await this.prisma.kegiatan.findUnique({ where: { id: query.kegiatanId } });
      if (kegiatan) {
        this.scopeHelper.verifyKegiatanScope(
          scope,
          kegiatan.scopeType ?? undefined,
          kegiatan.scopeId ?? undefined,
        );
      }
      where.kegiatanId = query.kegiatanId;
    } else if (scope) {
      // No kegiatanId filter: scope filter through kegiatan relation
      if (scope.rantingId) {
        where.kegiatan = { scopeType: 'ranting', scopeId: scope.rantingId };
      } else if (scope.wilayahId) {
        where.kegiatan = { scopeType: 'wilayah', scopeId: scope.wilayahId };
      } else if (scope.distrikId) {
        where.kegiatan = { scopeType: 'distrik', scopeId: scope.distrikId };
      }
    }

    return paginate(this.prisma.nilaiPendadaran, where, {
      page: query.page,
      limit: query.limit || 20,
      orderBy: { createdAt: 'desc' },
      include: { itemPenilaian: true, penguji: { select: { id: true, namaLengkap: true } } },
    });
  }

  async createScore(dto: CreateScoreDto, scope?: UserScope) {
    // Scope verification: verify the kegiatan is within scope
    if (dto.kegiatanId && scope) {
      const kegiatan = await this.prisma.kegiatan.findUnique({ where: { id: dto.kegiatanId } });
      if (kegiatan) {
        this.scopeHelper.verifyKegiatanScope(
          scope,
          kegiatan.scopeType ?? undefined,
          kegiatan.scopeId ?? undefined,
        );
      }
    }

    const score = await this.prisma.nilaiPendadaran.create({
      data: {
        kegiatanId: dto.kegiatanId,
        calonAnggotaId: dto.calonAnggotaId,
        anggotaId: dto.anggotaId,
        itemPenilaianId: dto.itemPenilaianId,
        pengujiUserId: dto.pengujiUserId,
        skor: dto.skor,
        komentar: dto.komentar,
      },
    });
    return { success: true, data: score, message: 'Nilai berhasil disimpan' };
  }

  async importScores(data: Record<string, unknown>[]) {
    let imported = 0;
    for (const row of data) {
      try {
        await this.prisma.nilaiPendadaran.create({
          data: {
            kegiatanId: row.kegiatan_id as string,
            calonAnggotaId: row.calon_anggota_id as string,
            itemPenilaianId: row.item_penilaian_id as string,
            pengujiUserId: row.penguji_user_id as string,
            skor: parseFloat(row.skor as string),
          },
        });
        imported++;
      } catch {
        /* skip */
      }
    }
    return { success: true, data: { imported, total: data.length } };
  }
}