import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx');

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async exportToXlsx(type: string, scope?: UserScope): Promise<Buffer> {
    const { content } = await this.exportData(type, 'xlsx', scope);
    return content as Buffer;
  }

  async exportToCsv(type: string, scope?: UserScope): Promise<string> {
    const { content } = await this.exportData(type, 'csv', scope);
    return content as string;
  }

  /**
   * Ekspor data dalam format xlsx/csv sekaligus mengembalikan jumlah baris
   * agar pemanggil bisa mencatat audit unduhan (jumlah baris yang diunduh).
   */
  async exportData(
    type: string,
    format: 'xlsx' | 'csv',
    scope?: UserScope,
  ): Promise<{ content: Buffer | string; rowCount: number; headers: string[] }> {
    const { data, headers } = await this.getExportData(type, scope);
    const sheetName = type.toUpperCase().slice(0, 31);
    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    worksheet['!cols'] = headers.map((h) => ({ wch: Math.max(h.length * 2, 15) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    if (format === 'csv') {
      const csv = XLSX.write(workbook, { type: 'string', bookType: 'csv' });
      return { content: '\uFEFF' + csv, rowCount: data.length, headers };
    }
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return { content: buffer, rowCount: data.length, headers };
  }

  /** Shared data fetcher for all export types, used by both XLSX and CSV export. */
  private async getExportData(type: string, scope?: UserScope) {
    switch (type) {
      case 'members':
        return this.getMembersData(scope);
      case 'dues':
        return this.getDuesData(scope);
      case 'trainings':
        return this.getTrainingData(scope);
      case 'candidates':
        return this.getCandidateData(scope);
      case 'graduations':
        return this.getGraduationData(scope);
      case 'assessments':
        return this.getAssessmentData(scope);
      case 'audit_logs':
        return this.getAuditLogData(scope);
      default:
        throw new Error(`Unknown export type: ${type}`);
    }
  }

  private async getMembersData(scope?: UserScope) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (scope?.rantingId) where.rantingId = scope.rantingId;
    else if (scope?.wilayahId) where.ranting = { wilayahId: scope.wilayahId };
    else if (scope?.distrikId) where.ranting = { wilayah: { distrikId: scope.distrikId } };

    const members = await this.prisma.anggota.findMany({
      where,
      include: { ranting: { select: { nama: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['NO', 'NAMA', 'NOMOR ANGGOTA', 'JENIS KELAMIN', 'RANTING', 'STATUS', 'NO HP', 'EMAIL'];
    const data = members.map((m, i) => ({
      NO: i + 1,
      NAMA: m.namaLengkap,
      'NOMOR ANGGOTA': m.nomorAnggota,
      'JENIS KELAMIN': m.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan',
      RANTING: m.ranting?.nama || '-',
      STATUS: m.statusKeanggotaan,
      'NO HP': m.noHp || '-',
      EMAIL: m.email || '-',
    }));

    return { data, headers };
  }

  private async getDuesData(scope?: UserScope) {
    const where: Record<string, unknown> = {};
    if (scope?.rantingId) where.anggota = { rantingId: scope.rantingId };
    else if (scope?.wilayahId) where.anggota = { ranting: { wilayahId: scope.wilayahId } };
    else if (scope?.distrikId) where.anggota = { ranting: { wilayah: { distrikId: scope.distrikId } } };

    const dues = await this.prisma.iuran.findMany({
      where,
      include: { anggota: { select: { nomorAnggota: true, namaLengkap: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['NO', 'NAMA', 'NOMOR', 'PERIODE', 'JUMLAH', 'STATUS', 'TANGGAL BAYAR'];
    const data = dues.map((d, i) => ({
      NO: i + 1,
      NAMA: d.anggota?.namaLengkap || '-',
      NOMOR: d.anggota?.nomorAnggota || '-',
      PERIODE: d.periode,
      JUMLAH: Number(d.jumlah),
      STATUS: d.status,
      'TANGGAL BAYAR': d.tanggalBayar?.toISOString().split('T')[0] || '-',
    }));

    return { data, headers };
  }

  private async getTrainingData(scope?: UserScope) {
    const where: Record<string, unknown> = {};
    if (scope?.rantingId) where.rantingId = scope.rantingId;
    else if (scope?.wilayahId) where.wilayahId = scope.wilayahId;

    const trainings = await this.prisma.latihan.findMany({
      where,
      include: {
        ranting: { select: { nama: true } },
        _count: { select: { absensi: true } },
      },
      orderBy: { hariTanggal: 'desc' },
    });

    const headers = ['NO', 'TANGGAL', 'RANTING', 'LOKASI', 'MATERI', 'PESERTA'];
    const data = trainings.map((t, i) => ({
      NO: i + 1,
      TANGGAL: t.hariTanggal.toISOString().split('T')[0],
      RANTING: t.ranting?.nama || '-',
      LOKASI: t.lokasi || '-',
      MATERI: t.jenisMateri || '-',
      PESERTA: t._count.absensi,
    }));

    return { data, headers };
  }

  private async getCandidateData(scope?: UserScope) {
    const where: Record<string, unknown> = {};
    if (scope?.rantingId) where.rantingId = scope.rantingId;

    const candidates = await this.prisma.calonAnggota.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['NO', 'NAMA', 'JENIS KELAMIN', 'STATUS', 'TANGGAL'];
    const data = candidates.map((c, i) => ({
      NO: i + 1,
      NAMA: c.namaLengkap,
      'JENIS KELAMIN': c.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan',
      STATUS: c.status,
      TANGGAL: c.createdAt.toISOString().split('T')[0],
    }));

    return { data, headers };
  }

  private async getGraduationData(scope?: UserScope) {
    const members = await this.prisma.calonAnggota.findMany({
      where: { status: 'lulus' },
      orderBy: { updatedAt: 'desc' },
    });

    const headers = ['NO', 'NAMA', 'STATUS', 'TANGGAL LULUS'];
    const data = members.map((m, i) => ({
      NO: i + 1,
      NAMA: m.namaLengkap,
      STATUS: m.status,
      'TANGGAL LULUS': m.updatedAt.toISOString().split('T')[0],
    }));

    return { data, headers };
  }

  private async getAssessmentData(scope?: UserScope) {
    const scores = await this.prisma.nilaiPendadaran.findMany({
      include: {
        calonAnggota: { select: { namaLengkap: true } },
        itemPenilaian: { select: { namaItem: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const headers = ['NO', 'NAMA', 'ITEM', 'SKOR', 'TANGGAL'];
    const data = scores.map((s, i) => ({
      NO: i + 1,
      NAMA: s.calonAnggota?.namaLengkap || '-',
      ITEM: s.itemPenilaian?.namaItem || '-',
      SKOR: Number(s.skor),
      TANGGAL: s.createdAt.toISOString().split('T')[0],
    }));

    return { data, headers };
  }

  private async getAuditLogData(_scope?: UserScope) {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const headers = [
      'NO',
      'WAKTU',
      'AKSI',
      'ENTITAS',
      'ID ENTITAS',
      'USER ID',
      'IP',
      'DETAIL',
    ];
    const data = logs.map((l, i) => ({
      NO: i + 1,
      WAKTU: l.createdAt.toISOString(),
      AKSI: l.action,
      ENTITAS: l.entity,
      'ID ENTITAS': l.entityId || '-',
      'USER ID': l.userId || '-',
      IP: l.ipAddress || '-',
      DETAIL: l.details ? JSON.stringify(l.details) : '-',
    }));

    return { data, headers };
  }
}