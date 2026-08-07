import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePenandatanganDto, UpdatePenandatanganDto } from './dto/penandatangan.dto';

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
  async getDocSigners(dokumenType?: string) {
    const where = dokumenType ? { dokumenType } : {};
    return this.prisma.dokumenPenandatangan.findMany({
      where,
      orderBy: [{ dokumenType: 'asc' }, { urutan: 'asc' }],
      include: { penandatangan: { select: { id: true, nama: true, jabatan: true, isActive: true } } },
    });
  }

  /**
   * Set penandatangan untuk satu tipe dokumen (1-3 orang).
   * PenandatanganId kosong diabaikan; array kosong = hapus semua penugasan (pakai bawaan).
   */
  async setDocSigners(dokumenType: string, penandatanganIds: string[]) {
    const ids = (penandatanganIds || []).filter(Boolean);
    if (ids.length > 3) {
      throw new BadRequestException('Maksimal 3 penandatangan per dokumen');
    }

    // Validasi semua ID ada di tabel penandatangans
    const count = await this.prisma.penandatangan.count({
      where: { id: { in: ids } },
    });
    if (count !== ids.length) {
      throw new BadRequestException('Salah satu penandatangan tidak ditemukan');
    }

    await this.prisma.$transaction([
      this.prisma.dokumenPenandatangan.deleteMany({ where: { dokumenType } }),
      ...ids.map((penandatanganId, idx) =>
        this.prisma.dokumenPenandatangan.create({
          data: { dokumenType, penandatanganId, urutan: idx + 1 },
        }),
      ),
    ]);

    return this.getDocSigners(dokumenType);
  }

  /**
   * Resolve penandatangan untuk satu tipe dokumen: prioritas penugasan tabel
   * `dokumen_penandatangans`, fallback ke penandatangan aktif (atau env SIGNER_*).
   * Mengembalikan array berurutan 1-3 orang.
   */
  async resolveSigners(dokumenType: string): Promise<{ signerName: string; signerTitle: string }[]> {
    try {
      const mapping = await this.prisma.dokumenPenandatangan.findMany({
        where: { dokumenType },
        orderBy: { urutan: 'asc' },
        include: { penandatangan: { select: { nama: true, jabatan: true } } },
      });
      if (mapping.length > 0) {
        return mapping.map((m) => ({
          signerName: m.penandatangan.nama,
          signerTitle: m.penandatangan.jabatan,
        }));
      }
    } catch {
      // tabel belum ada / belum migrate — lanjut ke fallback
    }
    return [await this.resolveActive()];
  }

  /** Struktur lengkap penugasan per tipe dokumen untuk halaman admin. */
  async getDocSignerAssignments() {
    const rows = await this.getDocSigners();
    return DOKUMEN_SIGNER_TYPES.map((t) => ({
      type: t.type,
      label: t.label,
      signers: rows
        .filter((r) => r.dokumenType === t.type)
        .map((r) => ({
          penandatanganId: r.penandatangan.id,
          nama: r.penandatangan.nama,
          jabatan: r.penandatangan.jabatan,
        })),
    }));
  }

  /** Cek apakah tipe dokumen punya penugasan penandatangan tersimpan. */
  async hasDocSigners(dokumenType: string): Promise<boolean> {
    try {
      const count = await this.prisma.dokumenPenandatangan.count({ where: { dokumenType } });
      return count > 0;
    } catch {
      return false;
    }
  }

  async findAll() {
    return this.prisma.penandatangan.findMany({
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  /** Penandatangan aktif yang dipakai pada kartu/sertifikat. */
  async findActive() {
    return this.prisma.penandatangan.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Resolve penandatangan yang dipakai pada dokumen (kartu, sertifikat, piagam):
   * prioritas dari tabel `penandatangans` (yang aktif), fallback ke env
   * SIGNER_NAME/SIGNER_TITLE, lalu default.
   */
  async resolveActive(): Promise<{ signerName: string; signerTitle: string }> {
    try {
      const active = await this.findActive();
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
    return this.prisma.$transaction(async (tx) => {
      if (dto.isActive) {
        // Pastikan hanya satu penandatangan aktif
        await tx.penandatangan.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }
      return tx.penandatangan.create({
        data: { nama: dto.nama, jabatan: dto.jabatan, isActive: dto.isActive ?? false },
      });
    });
  }

  async update(id: string, dto: UpdatePenandatanganDto) {
    const existing = await this.prisma.penandatangan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Penandatangan tidak ditemukan');

    return this.prisma.$transaction(async (tx) => {
      if (dto.isActive) {
        await tx.penandatangan.updateMany({
          where: { id: { not: id }, isActive: true },
          data: { isActive: false },
        });
      }

      return tx.penandatangan.update({
        where: { id },
        data: {
          ...(dto.nama !== undefined && { nama: dto.nama }),
          ...(dto.jabatan !== undefined && { jabatan: dto.jabatan }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
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
