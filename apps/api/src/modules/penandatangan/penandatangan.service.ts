import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePenandatanganDto, UpdatePenandatanganDto, DistrikScopeInfo } from './dto/penandatangan.dto';

/** Tipe dokumen yang mendukung penandatangan ganda (1-3 orang). */
export const DOKUMEN_SIGNER_TYPES = [
  { type: 'kartu_anggota', label: 'Kartu Anggota (KTA)' },
  { type: 'sertifikat_pendadaran', label: 'Sertifikat Pendadaran' },
  { type: 'sertifikat_pelatihan', label: 'Sertifikat Pelatihan' },
  { type: 'piagam_prestasi', label: 'Piagam Prestasi' },
] as const;

@Injectable()
export class PenandatanganService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Daftar penandatangan yang ditugaskan ke satu tipe dokumen, diurutkan `urutan`.
   * Termasuk `penandatanganId` agar mudah dipakai di form admin.
   */
  async getDocSigners(dokumenType?: string, distrikId?: string) {
    const where: Record<string, unknown> = { distrikId: distrikId ?? null };
    if (dokumenType) where.dokumenType = dokumenType;
    return this.prisma.dokumenPenandatangan.findMany({
      where: where as never,
      orderBy: [{ dokumenType: 'asc' }, { urutan: 'asc' }],
      include: {
        penandatangan: { select: { id: true, nama: true, jabatan: true, isActive: true, distrikId: true } },
      },
    });
  }

  /**
   * Set penandatangan untuk satu tipe dokumen pada scope tertentu (1-3 orang).
   * Semantik all-or-nothing per scope: set distrik menggantikan PENUH set global.
   * Array kosong = hapus penugasan scope ini (kembali mewarisi global).
   */
  async setDocSigners(dokumenType: string, penandatanganIds: string[], distrikId?: string | null) {
    const ids = (penandatanganIds || []).filter(Boolean);
    if (ids.length > 3) {
      throw new BadRequestException('Maksimal 3 penandatangan per dokumen');
    }
    const scopeKey = distrikId ?? null;

    if (ids.length > 0) {
      // Validasi semua ID ada di tabel penandatangans
      const count = await this.prisma.penandatangan.count({
        where: { id: { in: ids } },
      });
      if (count !== ids.length) {
        throw new BadRequestException('Salah satu penandatangan tidak ditemukan');
      }
    }

    await this.prisma.$transaction([
      this.prisma.dokumenPenandatangan.deleteMany({ where: { dokumenType, distrikId: scopeKey } }),
      ...ids.map((penandatanganId, idx) =>
        this.prisma.dokumenPenandatangan.create({
          data: { dokumenType, penandatanganId, distrikId: scopeKey, urutan: idx + 1 },
        }),
      ),
    ]);

    return this.getDocSigners(dokumenType, scopeKey ?? undefined);
  }

  /** Baris penugasan satu scope → array {signerName, signerTitle} terurut. */
  private async getDocSignerRows(dokumenType: string, distrikId?: string | null) {
    const mapping = await this.prisma.dokumenPenandatangan.findMany({
      where: { dokumenType, distrikId: distrikId ?? null },
      orderBy: { urutan: 'asc' },
      include: { penandatangan: { select: { nama: true, jabatan: true } } },
    });
    return mapping.map((m) => ({
      signerName: m.penandatangan.nama,
      signerTitle: m.penandatangan.jabatan,
    }));
  }

  /**
   * Resolve penandatangan untuk satu tipe dokumen + distrik anggota.
   * Rantai: penugasan distrik → penugasan global → penandatangan aktif
   * (distrik → global, via resolveActive) → fallback env SIGNER_*.
   * Mengembalikan array berurutan 1-3 orang.
   */
  async resolveSigners(dokumenType: string, distrikId?: string): Promise<{ signerName: string; signerTitle: string }[]> {
    try {
      if (distrikId) {
        const distrikSet = await this.getDocSignerRows(dokumenType, distrikId);
        if (distrikSet.length > 0) return distrikSet;
      }
      const globalSet = await this.getDocSignerRows(dokumenType);
      if (globalSet.length > 0) return globalSet;
    } catch {
      // tabel belum ada / belum migrate — lanjut ke fallback
    }
    return [await this.resolveActive(distrikId)];
  }

  /** Struktur lengkap penugasan per tipe dokumen untuk halaman admin (per scope). */
  async getDocSignerAssignments(distrikId?: string) {
    const rows = await this.getDocSigners(undefined, distrikId).catch(() => []);
    return DOKUMEN_SIGNER_TYPES.map((t) => {
      const scoped = rows.filter((r) => r.dokumenType === t.type);
      return {
        type: t.type,
        label: t.label,
        /** true = distrik ini punya penugasan sendiri; false = mengikuti global. */
        isCustom: scoped.length > 0,
        signers: scoped.map((r) => ({
          penandatanganId: r.penandatangan.id,
          nama: r.penandatangan.nama,
          jabatan: r.penandatangan.jabatan,
        })),
      };
    });
  }

  /** Cek apakah ada penugasan penandatangan tersimpan pada scope. */
  async hasDocSigners(dokumenType: string, distrikId?: string): Promise<boolean> {
    try {
      const count = await this.prisma.dokumenPenandatangan.count({
        where: { dokumenType, distrikId: distrikId ?? null },
      });
      return count > 0;
    } catch {
      return false;
    }
  }

  async findAll() {
    return this.prisma.penandatangan.findMany({
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      include: { distrik: { select: { id: true, nama: true } } },
    });
  }

  /**
   * Penandatangan aktif untuk scope: prioritas distrik, fallback global.
   * Tanpa distrikId → global (perilaku lama).
   */
  async findActive(distrikId?: string) {
    try {
      if (distrikId) {
        const distrikSigner = await this.prisma.penandatangan.findFirst({
          where: { isActive: true, distrikId },
          orderBy: { updatedAt: 'desc' },
        });
        if (distrikSigner) return distrikSigner;
      }
      return await this.prisma.penandatangan.findFirst({
        where: { isActive: true, distrikId: null },
        orderBy: { updatedAt: 'desc' },
      });
    } catch {
      return null;
    }
  }

  /**
   * Resolve penandatangan yang dipakai pada dokumen (kartu, sertifikat, piagam):
   * distrik anggota dulu, lalu global, lalu env SIGNER_NAME/SIGNER_TITLE.
   */
  async resolveActive(distrikId?: string): Promise<{ signerName: string; signerTitle: string }> {
    try {
      const active = await this.findActive(distrikId);
      if (active) {
        return { signerName: active.nama, signerTitle: active.jabatan };
      }
    } catch {
      // tabel belum ada / belum migrate — lanjut ke fallback env
    }
    return {
      signerName: process.env.SIGNER_NAME || 'Koordinator Distrik',
      signerTitle: process.env.SIGNER_TITLE || 'THS-THM',
    };
  }

  async create(dto: CreatePenandatanganDto) {
    const scopeKey = dto.distrikId ?? null;
    return this.prisma.$transaction(async (tx) => {
      if (dto.isActive) {
        // Pastikan hanya satu penandatangan aktif dalam scope ini
        await tx.penandatangan.updateMany({
          where: { isActive: true, distrikId: scopeKey },
          data: { isActive: false },
        });
      }
      return tx.penandatangan.create({
        data: {
          nama: dto.nama,
          jabatan: dto.jabatan,
          isActive: dto.isActive ?? false,
          distrikId: scopeKey,
        },
      });
    });
  }

  async update(id: string, dto: UpdatePenandatanganDto, scope?: DistrikScopeInfo) {
    const existing = await this.prisma.penandatangan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Penandatangan tidak ditemukan');

    // admin_distrik hanya boleh mengubah penandatangan distriknya sendiri
    if (scope?.role === 'admin_distrik' && (existing.distrikId ?? null) !== (scope.distrikId ?? null)) {
      throw new ForbiddenException('Anda hanya dapat mengubah penandatangan distrik Anda sendiri');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isActive) {
        // Satu aktif per scope — target = scope baru bila berpindah, selain itu scope lama
        const targetScope = dto.distrikId !== undefined ? (dto.distrikId ?? null) : (existing.distrikId ?? null);
        await tx.penandatangan.updateMany({
          where: { id: { not: id }, isActive: true, distrikId: targetScope },
          data: { isActive: false },
        });
      }

      return tx.penandatangan.update({
        where: { id },
        data: {
          ...(dto.nama !== undefined && { nama: dto.nama }),
          ...(dto.jabatan !== undefined && { jabatan: dto.jabatan }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.distrikId !== undefined && { distrikId: dto.distrikId ?? null }),
        },
      });
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.penandatangan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Penandatangan tidak ditemukan');
    if (existing.isActive) {
      throw new BadRequestException('Penandatangan aktif tidak dapat dihapus. Nonaktifkan dulu atau pilih penandatangan aktif lainnya.');
    }

    await this.prisma.penandatangan.delete({ where: { id } });
    return { deleted: true };
  }
}
