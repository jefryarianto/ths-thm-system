import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
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
  skorMaksimal?: number;
}

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
  ) {}

  // ── Items ─────────────────────────────────────────────

  async getItems(query: AssessmentFilterDto) {
    const where: Record<string, unknown> = {};
    if (query.aspekId) where.aspekId = query.aspekId;
    const data = await this.prisma.itemPenilaian.findMany({
      where,
      include: { aspek: true },
      orderBy: { urutan: 'asc' },
    });
    return data;
  }

  async getItem(id: string) {
    const item = await this.prisma.itemPenilaian.findUnique({
      where: { id },
      include: { aspek: true },
    });
    if (!item) throw new NotFoundException('Item tidak ditemukan');
    return item;
  }

  async createItem(dto: CreateItemDto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = await this.prisma.itemPenilaian.create({ data: dto as any });
    return item;
  }

  async updateItem(id: string, dto: UpdateItemDto) {
    const item = await this.prisma.itemPenilaian.update({ where: { id }, data: dto });
    return item;
  }

  async deleteItem(id: string) {
    await this.prisma.itemPenilaian.update({ where: { id }, data: { isActive: false } });
  }

  // ── Import Aspek & Item dari List ──

  async importFromList(data: ImportRow[]) {
    if (!data || data.length === 0) {
      return { importedAspects: 0, importedItems: 0, total: 0, errors: [] };
    }

    const errors: string[] = [];
    const aspekMap = new Map<string, { no: number; rows: ImportRow[] }>();
    
    // Group by aspek name and track the first 'no' for each aspect
    for (const row of data) {
      const key = row.aspek.trim().toUpperCase();
      if (!aspekMap.has(key)) {
        aspekMap.set(key, { no: row.no, rows: [] });
      }
      aspekMap.get(key)!.rows.push(row);
    }

    let importedAspects = 0;
    let importedItems = 0;
    let skippedItems = 0;

    for (const [aspekName, { no, rows }] of aspekMap.entries()) {
      if (!no || no < 1) {
        errors.push(`Aspek "${aspekName}" memiliki nomor tidak valid: ${no}`);
        continue;
      }

      const kodeAspek = `A${String(no).padStart(2, '0')}`;

      // Check if kodeAspek already exists with different name
      const existingAspekByCode = await this.prisma.aspekPenilaian.findUnique({
        where: { kodeAspek },
      });

      if (existingAspekByCode && existingAspekByCode.namaAspek.toUpperCase() !== aspekName) {
        errors.push(`Kode aspek ${kodeAspek} sudah digunakan untuk aspek lain: "${existingAspekByCode.namaAspek}"`);
        continue;
      }

      let aspek = existingAspekByCode;

      if (!aspek) {
        const totalAspects = aspekMap.size;
        const bobot = parseFloat((1 / totalAspects).toFixed(4)); // Normalize to 4 decimal places
        
        try {
          aspek = await this.prisma.aspekPenilaian.create({
            data: {
              kodeAspek,
              namaAspek: aspekName,
              bobot,
              deskripsi: `Aspek ${aspekName}`,
              isActive: true,
            },
          });
          importedAspects++;
        } catch (err) {
          errors.push(`Gagal membuat aspek "${aspekName}": ${(err as Error).message}`);
          continue;
        }
      }

      let urutan = 1;
      for (const row of rows) {
        if (!row.item || row.item.trim() === '') {
          errors.push(`Item kosong pada aspek "${aspekName}" baris ${row.no}`);
          continue;
        }

        const kodeItem = `I${String(no).padStart(2, '0')}${String(urutan).padStart(2, '0')}`;

        const existing = await this.prisma.itemPenilaian.findUnique({
          where: { kodeItem },
        });

        if (!existing) {
          try {
            await this.prisma.itemPenilaian.create({
              data: {
                aspekId: aspek.id,
                kodeItem,
                namaItem: row.item.trim(),
                skorMaksimal: row.skorMaksimal || 100,
                bobot: 1,
                urutan,
                isActive: true,
              },
            });
            importedItems++;
          } catch (err) {
            errors.push(`Gagal membuat item "${row.item}": ${(err as Error).message}`);
          }
        } else {
          skippedItems++;
        }
        urutan++;
      }
    }

    this.logger.log(`Import completed: ${importedAspects} aspects, ${importedItems} items, ${skippedItems} skipped, ${errors.length} errors`);

    return { 
      importedAspects, 
      importedItems, 
      skippedItems,
      total: data.length,
      errors 
    };
  }

  async importFromCsvText(csvText: string) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      return { importedAspects: 0, importedItems: 0, total: 0 };
    }

    const headerLine = lines[0].trim().toLowerCase();
    const headers = this.parseCsvLine(headerLine);
    const colIndices: Record<string, number> = {};
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].replace(/[^a-z_]/g, '');
      if (h === 'no' || h === 'nomor') colIndices.no = i;
      else if (h === 'aspek' || h === 'aspe') colIndices.aspek = i;
      else if (h === 'item' || h === 'items') colIndices.item = i;
      else if (h === 'deskripsi' || h === 'deskri') colIndices.deskripsi = i;
      else if (h === 'skor_max' || h === 'skormax' || h === 'skor maksimal' || h === 'nilai_max') colIndices.skorMax = i;
    }

    const data: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCsvLine(line);
      if (values.length >= 3) {
        data.push({
          no: colIndices.no !== undefined ? (parseInt(values[colIndices.no], 10) || 0) : i,
          aspek: (colIndices.aspek !== undefined ? values[colIndices.aspek] : values[1]).trim(),
          item: (colIndices.item !== undefined ? values[colIndices.item] : values[2]).trim(),
          deskripsi: colIndices.deskripsi !== undefined ? values[colIndices.deskripsi]?.trim() : '',
          skorMaksimal: colIndices.skorMax !== undefined ? (parseInt(values[colIndices.skorMax], 10) || 100) : undefined,
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
      const nextChar = line[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          // Escaped quote inside quoted field
          current += '"';
          i++; // Skip next quote
        } else if (char === '"') {
          // End of quoted field
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          // Start of quoted field
          inQuotes = true;
        } else if (char === ',') {
          // Field separator
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }

    // Push the last field
    result.push(current.trim());
    return result;
  }

  // ── Scores ──

  async getScores(query: ScoreFilterDto, scope?: UserScope) {
    const where: Record<string, unknown> = {};
    if (query.calonAnggotaId) where.calonAnggotaId = query.calonAnggotaId;

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
    return score;
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
    return { imported, total: data.length };
  }
}
