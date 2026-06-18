import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx');

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async exportToXlsx(type: string, scope?: UserScope): Promise<Buffer> {
    let data: Record<string, unknown>[] = [];
    let headers: string[] = [];

    switch (type) {
      case 'members':
        ({ data, headers } = await this.getMembersData(scope));
        break;
      case 'dues':
        ({ data, headers } = await this.getDuesData(scope));
        break;
      case 'trainings':
        ({ data, headers } = await this.getTrainingData(scope));
        break;
      case 'candidates':
        ({ data, headers } = await this.getCandidateData(scope));
        break;
      case 'graduations':
        ({ data, headers } = await this.getGraduationData(scope));
        break;
      case 'assessments':
        ({ data, headers } = await this.getAssessmentData(scope));
        break;
      default:
        throw new Error(`Unknown export type: ${type}`);
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });

    // Set column widths
    worksheet['!cols'] = headers.map((h) => ({ wch: Math.max(h.length * 2, 15) }));

    XLSX.utils.book_append_sheet(workbook, worksheet, type.toUpperCase());
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  async exportToCsv(type: string, scope?: UserScope): Promise<string> {
    let data: Record<string, unknown>[] = [];
    let headers: string[] = [];

    switch (type) {
      case 'members':
        ({ data, headers } = await this.getMembersData(scope));
        break;
      case 'dues':
        ({ data, headers } = await this.getDuesData(scope));
        break;
      case 'trainings':
        ({ data, headers } = await this.getTrainingData(scope));
        break;
      default:
        throw new Error(`Unknown export type: ${type}`);
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    XLSX.utils.book_append_sheet(workbook, worksheet, type.toUpperCase());
    const csv = XLSX.write(workbook, { type: 'string', bookType: 'csv' });
    return csv;
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
}