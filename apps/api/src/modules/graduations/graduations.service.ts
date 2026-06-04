import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGraduationDto, GraduationFilterDto, RegisterParticipantDto, GraduateDto } from './dto/graduation.dto';

@Injectable()
export class GraduationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GraduationFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const where: Record<string, unknown> = { tipe: 'pendadaran' };
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.kegiatan.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { tanggalMulai: 'desc' },
      }),
      this.prisma.kegiatan.count({ where }),
    ]);

    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const graduation = await this.prisma.kegiatan.findUnique({ where: { id } });
    if (!graduation) throw new NotFoundException('Pendadaran tidak ditemukan');
    return { success: true, data: graduation };
  }

  async create(dto: CreateGraduationDto) {
    const graduation = await this.prisma.kegiatan.create({
      data: {
        nama: dto.nama,
        lokasi: dto.lokasi,
        tanggalMulai: new Date(dto.tanggalMulai),
        tanggalSelesai: dto.tanggalSelesai ? new Date(dto.tanggalSelesai) : undefined,
        scopeType: dto.scopeType as 'nasional' | 'distrik' | 'wilayah' | 'ranting' | 'unit_latihan' | undefined,
        scopeId: dto.scopeId,
        tipe: 'pendadaran',
        status: 'draft',
      } as never,
    });
    return { success: true, data: graduation, message: 'Pendadaran berhasil dibuat' };
  }

  async registerParticipant(graduationId: string, dto: RegisterParticipantDto) {
    const candidate = await this.prisma.calonAnggota.update({
      where: { id: dto.candidateId },
      data: { status: 'mengikuti_pendadaran' },
    });
    return { success: true, data: candidate, message: 'Peserta berhasil didaftarkan' };
  }

  async unregisterParticipant(graduationId: string, dto: RegisterParticipantDto) {
    await this.prisma.calonAnggota.update({
      where: { id: dto.candidateId },
      data: { status: 'diusulkan' },
    });
    return { success: true, message: 'Peserta berhasil dibatalkan' };
  }

  async getParticipants(graduationId: string) {
    const participants = await this.prisma.calonAnggota.findMany({
      where: { status: 'mengikuti_pendadaran' },
      include: { ranting: true },
    });
    return { success: true, data: participants };
  }

  async importParticipants(graduationId: string, data: Array<{ candidateId?: string; id?: string }>) {
    const kegiatan = await this.prisma.kegiatan.findUnique({ where: { id: graduationId } });
    if (!kegiatan) throw new NotFoundException('Pendadaran tidak ditemukan');

    let imported = 0;
    for (const row of data) {
      const candidateId = row.candidateId || row.id;
      if (!candidateId) continue;
      const candidate = await this.prisma.calonAnggota.findUnique({ where: { id: candidateId } });
      if (candidate && candidate.status === 'diusulkan') {
        await this.prisma.calonAnggota.update({
          where: { id: candidateId },
          data: { status: 'mengikuti_pendadaran' },
        });
        imported++;
      }
    }
    return { success: true, data: { imported }, message: `${imported} peserta berhasil diimpor` };
  }

  async graduate(graduationId: string, dto: GraduateDto) {
    for (const result of dto.results || []) {
      await this.prisma.hasilPendadaran.create({
        data: {
          kegiatanId: graduationId,
          calonAnggotaId: result.candidateId,
          totalSkor: result.totalSkor,
          ranking: result.ranking,
          statusKelulusan: result.lulus ? 'lulus' : 'gagal',
          statusValidasi: 'pending',
        },
      });

      await this.prisma.calonAnggota.update({
        where: { id: result.candidateId },
        data: { status: result.lulus ? 'lulus' : 'gagal' },
      });
    }

    return { success: true, message: 'Hasil pendadaran berhasil disimpan' };
  }

  async generateDocuments(graduationId: string) {
    const graduates = await this.prisma.hasilPendadaran.findMany({
      where: { kegiatanId: graduationId, statusKelulusan: 'lulus' },
    });

    return {
      success: true,
      data: { totalGraduates: graduates.length, message: 'Dokumen dalam antrian generate' },
    };
  }
}
