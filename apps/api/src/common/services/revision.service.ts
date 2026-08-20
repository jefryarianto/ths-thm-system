import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface DiffChange {
  field: string;
  before: unknown;
  after: unknown;
}

/** Field sistem yang tidak pernah masuk ke diff/restore. */
const EXCLUDED_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'createdBy',
  'version',
]);

/**
 * Hitung daftar perubahan field antara dua objek.
 * Nilai dibandingkan via JSON — berlaku untuk scalar, array, maupun objek.
 */
export function diffObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): DiffChange[] {
  const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: DiffChange[] = [];

  for (const field of fields) {
    if (EXCLUDED_FIELDS.has(field)) continue;
    const b = before[field];
    const a = after[field];
    if (JSON.stringify(b ?? null) !== JSON.stringify(a ?? null)) {
      changes.push({ field, before: b ?? null, after: a ?? null });
    }
  }
  return changes;
}

/**
 * Riwayat revisi data per entitas (audit diff + restore).
 *
 * Mencatat sebelum/sesudah setiap UPDATE pada model yang dipilih, menyediakan
 * daftar riwayat perubahan per baris, perbandingan antar revisi, dan restore
 * nilai lama (rollback field yang berubah).
 *
 * Direkomendasikan untuk data kritis: anggota, klaim, iuran, calon anggota,
 * latihan — agar setiap perubahan bisa dilacak dan dipulihkan bila keliru.
 */
@Injectable()
export class RevisionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Catat revisi perubahan data.
   * @returns ID revisi yang dibuat (null bila gagal).
   */
  async recordUpdate(
    entity: string,
    entityId: string,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
    changedById?: string | null,
    action: 'UPDATE' | 'RESTORE' = 'UPDATE',
  ): Promise<string | null> {
    try {
      const diff = before && after ? diffObjects(before, after) : [];
      const created = await this.prisma.dataRevision.create({
        data: {
          entity,
          entityId,
          action,
          before: (before ?? undefined) as Prisma.InputJsonValue | undefined,
          after: (after ?? undefined) as Prisma.InputJsonValue | undefined,
          diff: (diff.length ? diff : undefined) as Prisma.InputJsonValue | undefined,
          changedById: changedById ?? null,
        },
      });
      return created.id;
    } catch {
      return null;
    }
  }

  /**
   * Daftar riwayat revisi untuk satu entitas (terbaru dulu, ter-paginate).
   */
  async listRevisions(
    entity: string,
    entityId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: unknown[]; total: number; page: number; limit: number }> {
    const perPage = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * perPage;

    const total = await this.prisma.dataRevision.count({ where: { entity, entityId } });
    const data = await this.prisma.dataRevision.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
      include: { changedBy: { select: { id: true, namaLengkap: true, email: true } } },
    });

    return { data, total, page: Math.max(page, 1), limit: perPage };
  }

  /**
   * Ambil satu revisi beserta diff-nya.
   */
  async getRevision(id: string): Promise<{ id: string; diff: DiffChange[]; data: unknown }> {
    const rev = await this.prisma.dataRevision.findUnique({
      where: { id },
      include: { changedBy: { select: { id: true, namaLengkap: true, email: true } } },
    });
    if (!rev) {
      throw new NotFoundException('Revisi tidak ditemukan');
    }
    return {
      id: rev.id,
      diff: (rev.diff ?? []) as unknown as DiffChange[],
      data: rev,
    };
  }

  /**
   * Bandingkan dua revisi untuk entitas yang sama — menampilkan apa yang
   * berubah antar dua titik waktu (dari → ke).
   */
  async compareRevisions(
    entity: string,
    entityId: string,
    fromId: string,
    toId: string,
  ): Promise<{ from: unknown; to: unknown; diff: DiffChange[] }> {
    const fromRev = await this.prisma.dataRevision.findUnique({ where: { id: fromId } });
    const toRev = await this.prisma.dataRevision.findUnique({ where: { id: toId } });
    if (!fromRev || !toRev || fromRev.entity !== entity || fromRev.entityId !== entityId) {
      throw new NotFoundException('Salah satu revisi tidak ditemukan');
    }
    const before = (fromRev.after ?? {}) as Record<string, unknown>;
    const after = (toRev.after ?? {}) as Record<string, unknown>;
    return { from: fromRev, to: toRev, diff: diffObjects(before, after) };
  }

  /**
   * Pulihkan (restore) data ke nilai lama dari sebuah revisi.
   * Hanya field yang berubah pada revisi tersebut yang dikembalikan.
   * Menulis revisi baru ber-action RESTORE sebagai jejak pemulihan.
   */
  async restore(
    entity: string,
    entityId: string,
    revisionId: string,
    changedById?: string | null,
  ): Promise<{ id: string; restored: Record<string, unknown> }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (this.prisma as unknown as Record<string, any>)[entity];
    if (!delegate || typeof delegate.update !== 'function') {
      throw new NotFoundException('Entitas tidak dikenali');
    }

    const rev = await this.prisma.dataRevision.findUnique({ where: { id: revisionId } });
    if (!rev || rev.entity !== entity || rev.entityId !== entityId) {
      throw new NotFoundException('Revisi tidak ditemukan');
    }

    const diff = (rev.diff ?? []) as unknown as DiffChange[];
    if (diff.length === 0) {
      throw new NotFoundException('Tidak ada perubahan yang bisa dipulihkan');
    }

    // Ambil nilai terkini untuk dijadikan "before" pada revisi RESTORE nanti.
    const current = await delegate.findUnique({ where: { id: entityId } });
    if (!current) {
      throw new NotFoundException('Data tidak ditemukan');
    }

    const data: Record<string, unknown> = {};
    for (const change of diff) {
      const value = change.before;
      if (!EXCLUDED_FIELDS.has(change.field)) {
        data[change.field] = value;
      }
    }

    const restored = await delegate.update({
      where: { id: entityId },
      data,
    });

    await this.recordUpdate(entity, entityId, current, restored, changedById, 'RESTORE');

    return { id: revisionId, restored };
  }
}