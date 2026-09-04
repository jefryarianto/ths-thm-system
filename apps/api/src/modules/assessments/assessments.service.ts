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
import { CacheService } from '../../common/services/cache.service';
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
    private readonly cache: CacheService,
  ) {}

  // ── Items ─────────────────────────────────────────────

  async getItems(query: AssessmentFilterDto) {
    // Hanya tampilkan item AKTIF — soft-disable (isActive:false) tidak muncul di list.
    // (Alur scoring mobile/penguji memakai default ini; admin web pakai includeInactive.)
    const where: Record<string, unknown> = { isActive: true };
    if (query.aspekId) {
      where.aspekId = query.aspekId;
    } else if (query.kegiatanId) {
      // Item milik pendadaran (via aspek); fallback ke template bila pendadaran
      // belum punya set sendiri (legacy — belum di-clone).
      const owned = await this.prisma.aspekPenilaian.count({
        where: { kegiatanId: query.kegiatanId },
      });
      where.aspek = {
        kegiatanId: owned > 0 ? query.kegiatanId : null,
        isActive: true,
      };
    }
    if (query.search) {
      where.namaItem = { contains: query.search, mode: 'insensitive' };
    }
    return paginate(this.prisma.itemPenilaian, where, {
      page: query.page,
      // Default besar untuk konsumen yang tidak kirim limit (mobile scoring butuh SEMUA item per aspek)
      limit: query.limit || 100,
      orderBy: { urutan: 'asc' },
      include: { aspek: true },
    });
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

  async importFromList(data: ImportRow[], kegiatanId?: string) {
    if (!data || data.length === 0) {
      return { importedAspects: 0, importedItems: 0, total: 0 };
    }
    // kegiatanId terisi → aspek/item dibuat milik pendadaran tsb;
    // tanpa → template global. Matching idempoten dilakukan dalam scope yang sama.
    const scopeKegiatanId = kegiatanId || null;

    // Kelompokkan per aspek, dengan forward-fill untuk sel ASPEK kosong
    // (pola merged-cell Excel) dan skip baris yang aspek & item-nya kosong.
    // Kode aspek/item memakai URUTAN KEMUNCULAN GRUP (bukan kolom NO yang
    // sering kosong/terisi nomor baris oleh Excel) agar deterministik.
    const aspekMap = new Map<string, ImportRow[]>();
    let lastAspek = '';
    let processedRows = 0;
    for (const row of data) {
      const aspekName = row.aspek?.trim();
      if (aspekName) {
        lastAspek = aspekName;
      } else if (!lastAspek) {
        lastAspek = 'Aspek Umum';
      }
      const itemName = row.item?.trim();
      if (!lastAspek || !itemName) continue; // baris sampah / kosong

      const key = lastAspek.toUpperCase();
      if (!aspekMap.has(key)) {
        aspekMap.set(key, []);
      }
      aspekMap.get(key)!.push({ ...row, aspek: lastAspek, item: itemName });
      processedRows++;
    }

    let importedAspects = 0;
    let importedItems = 0;
    let updatedItems = 0;
    let groupNo = 0;

    for (const [, rows] of aspekMap) {
      groupNo++;
      const aspekName = rows[0].aspek;

      // Match aspek berdasarkan NAMA (case-insensitive) dalam scope yang sama
      // agar re-import idempoten — tidak membuat aspek duplikat walau kode lama berbeda.
      let aspek = await this.prisma.aspekPenilaian.findFirst({
        where: {
          namaAspek: { equals: aspekName, mode: 'insensitive' },
          kegiatanId: scopeKegiatanId,
        },
      });

      if (!aspek) {
        const bobot = Math.round(100 / aspekMap.size);
        const kodeAspek = `A${String(groupNo).padStart(2, '0')}`;
        const baseData = {
          namaAspek: aspekName,
          bobot,
          deskripsi: `Aspek ${aspekName}`,
          kegiatanId: scopeKegiatanId,
        };
        try {
          aspek = await this.prisma.aspekPenilaian.create({
            data: { kodeAspek, ...baseData },
          });
        } catch (err) {
          // Kode bentrok dengan aspek lama bernama berbeda → suffix aman
          if ((err as { code?: string })?.code !== 'P2002') throw err;
          aspek = await this.prisma.aspekPenilaian.create({
            data: {
              kodeAspek: `${kodeAspek}-${Date.now().toString(36).slice(-4)}`,
              ...baseData,
            },
          });
        }
        importedAspects++;
      }

      // Dedupe item per aspek berdasarkan NAMA (bukan kode) — re-import
      // yang sama tidak menduplikat item.
      const existingItems = await this.prisma.itemPenilaian.findMany({
        where: { aspekId: aspek.id },
        select: { id: true, namaItem: true, skorMaksimal: true },
      });
      const existingByName = new Map(
        existingItems.map((i) => [i.namaItem.trim().toUpperCase(), i]),
      );

      let urutan = 0;
      for (const row of rows) {
        urutan++;
        const maxSkor = row.skorMaksimal || 100;
        const dup = existingByName.get(row.item.toUpperCase());
        if (dup) {
          // Re-import: sinkronkan skor maksimal bila berubah di CSV
          if (Number(dup.skorMaksimal) !== maxSkor) {
            await this.prisma.itemPenilaian.update({
              where: { id: dup.id },
              data: { skorMaksimal: maxSkor },
            });
            updatedItems++;
          }
          continue;
        }

        const kodeItem = `I${String(groupNo).padStart(2, '0')}${String(urutan).padStart(2, '0')}`;
        const itemData = {
          aspekId: aspek.id,
          namaItem: row.item,
          skorMaksimal: maxSkor,
          bobot: 1,
          urutan,
          isActive: true,
        };
        try {
          await this.prisma.itemPenilaian.create({
            data: { kodeItem, ...itemData },
          });
        } catch (err) {
          // Kode bentrok dengan item aspek lain (data lama) → suffix aman
          if ((err as { code?: string })?.code !== 'P2002') throw err;
          await this.prisma.itemPenilaian.create({
            data: {
              kodeItem: `${kodeItem}-${Date.now().toString(36).slice(-4)}`,
              ...itemData,
            },
          });
        }
        importedItems++;
      }
    }

    // List aspek di-cache — pastikan data baru langsung tampil tanpa menunggu TTL
    this.cache.invalidatePrefix('aspects:');

    this.logger.log(
      `Import completed: ${importedAspects} aspects, ${importedItems} items, ${updatedItems} updated (${processedRows} rows)`,
    );

    return { importedAspects, importedItems, updatedItems, total: processedRows };
  }

  // ── Clone Template → Pendadaran ─────────────────────────

  /**
   * Clone semua aspek+item template (kegiatanId=null, aktif) menjadi milik
   * pendadaran tertentu. Idempoten: bila pendadaran sudah punya aspek sendiri,
   * tidak menduplikat. Kode diberi suffix unik per pendadaran (kodeAspek unik
   * global; kode item unik per aspek).
   */
  async cloneTemplateForKegiatan(
    kegiatanId: string,
  ): Promise<{ clonedAspects: number; clonedItems: number; skipped?: boolean }> {
    const owned = await this.prisma.aspekPenilaian.count({ where: { kegiatanId } });
    if (owned > 0) return { clonedAspects: 0, clonedItems: 0, skipped: true };

    const templates = await this.prisma.aspekPenilaian.findMany({
      where: { kegiatanId: null, isActive: true },
      include: { itemPenilaian: { where: { isActive: true }, orderBy: { urutan: 'asc' } } },
      orderBy: { namaAspek: 'asc' },
    });
    if (templates.length === 0) return { clonedAspects: 0, clonedItems: 0 };

    const suffix = Date.now().toString(36).slice(-5);
    let clonedAspects = 0;
    let clonedItems = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const tpl of templates) {
        const newKodeAspek = `${tpl.kodeAspek}-K${suffix}`;
        let aspek;
        try {
          aspek = await tx.aspekPenilaian.create({
            data: {
              kodeAspek: newKodeAspek,
              namaAspek: tpl.namaAspek,
              deskripsi: tpl.deskripsi,
              bobot: tpl.bobot,
              isActive: true,
              kegiatanId,
            },
          });
        } catch (err) {
          // Kode bentrok (clone paralel) → suffix tambahan aman
          if ((err as { code?: string })?.code !== 'P2002') throw err;
          aspek = await tx.aspekPenilaian.create({
            data: {
              kodeAspek: `${newKodeAspek}-${Date.now().toString(36).slice(-4)}`,
              namaAspek: tpl.namaAspek,
              deskripsi: tpl.deskripsi,
              bobot: tpl.bobot,
              isActive: true,
              kegiatanId,
            },
          });
        }
        clonedAspects++;

        for (const item of tpl.itemPenilaian) {
          const newKodeItem = `${item.kodeItem}-K${suffix}`;
          const itemData = {
            aspekId: aspek.id,
            namaItem: item.namaItem,
            skorMaksimal: item.skorMaksimal,
            bobot: item.bobot,
            urutan: item.urutan,
            isActive: true,
          };
          try {
            await tx.itemPenilaian.create({ data: { kodeItem: newKodeItem, ...itemData } });
          } catch (err) {
            if ((err as { code?: string })?.code !== 'P2002') throw err;
            await tx.itemPenilaian.create({
              data: {
                kodeItem: `${newKodeItem}-${Date.now().toString(36).slice(-4)}`,
                ...itemData,
              },
            });
          }
          clonedItems++;
        }
      }
    });

    this.cache.invalidatePrefix('aspects:');
    this.logger.log(
      `Clone template → kegiatan ${kegiatanId}: ${clonedAspects} aspek, ${clonedItems} item`,
    );
    return { clonedAspects, clonedItems };
  }

  /** Aktifkan kembali item penilaian yang disembunyikan (soft-disable). */
  async restoreItem(id: string) {
    const item = await this.prisma.itemPenilaian.update({
      where: { id },
      data: { isActive: true },
    });
    this.cache.invalidatePrefix('aspects:');
    return item;
  }

  async importFromCsvText(csvText: string, kegiatanId?: string) {
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
      // Dukung variasi umum: SKOR_MAX, SCORE_MAX, SKORMAX, NILAI_MAX
      else if (
        h === 'skor_max' ||
        h === 'score_max' ||
        h === 'skormax' ||
        h === 'scoremax' ||
        h === 'skormaksimal' ||
        h === 'skor maksimal' ||
        h === 'nilai_max'
      )
        colIndices.skorMax = i;
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

    return this.importFromList(data, kegiatanId);
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

  // ── Scores ──

  async getScores(query: ScoreFilterDto, scope?: UserScope, userId?: string, role?: string) {
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
    } else if (role === 'penguji' && userId) {
      // Penguji can only see scores for kegiatan they're assigned to
      const assignments = await this.prisma.penugasanPenguji.findMany({
        where: { pengujiUserId: userId, status: 'approved' },
        select: { kegiatanId: true },
      });
      const kegiatanIds = assignments.map((a) => a.kegiatanId);
      if (kegiatanIds.length === 0) {
        // No assigned kegiatan, return empty
        return { data: [], meta: { total: 0, totalPages: 0, page: query.page || 1, limit: query.limit || 20 } };
      }
      where.kegiatanId = { in: kegiatanIds };
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
