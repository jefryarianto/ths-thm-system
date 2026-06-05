import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExaminerDto, UpdateExaminerDto, ExaminerFilterDto, AssignExaminerDto } from './dto/examiner.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import bcrypt from 'bcryptjs';

@Injectable()
export class ExaminersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
  ) {}

  async findAll(query: ExaminerFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const where: Record<string, unknown> = { role: 'penguji', isActive: true };
    if (query.search) where.namaLengkap = { contains: query.search };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, select: { id: true, email: true, namaLengkap: true, createdAt: true } }),
      this.prisma.user.count({ where }),
    ]);
    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const examiner = await this.prisma.user.findUnique({ where: { id, role: 'penguji' } });
    if (!examiner) throw new NotFoundException('Penguji tidak ditemukan');
    return { success: true, data: examiner };
  }

  async create(dto: CreateExaminerDto) {
    const passwordHash = await bcrypt.hash(dto.password || 'password123', 12);
    const examiner = await this.prisma.user.create({ data: { email: dto.email, namaLengkap: dto.namaLengkap, role: 'penguji', passwordHash } });
    return { success: true, data: examiner, message: 'Penguji berhasil ditambahkan' };
  }

  async update(id: string, dto: UpdateExaminerDto) {
    const data: Record<string, unknown> = {};
    if (dto.email) data.email = dto.email;
    if (dto.namaLengkap) data.namaLengkap = dto.namaLengkap;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);

    const examiner = await this.prisma.user.update({ where: { id }, data });
    return { success: true, data: examiner, message: 'Data penguji diperbarui' };
  }

  async remove(id: string) {
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    return { success: true, message: 'Penguji dinonaktifkan' };
  }

  async importCsv(data: Record<string, unknown>[]) {
    let imported = 0;
    const passwordHash = await bcrypt.hash('password123', 12);
    for (const row of data) {
      try {
        await this.prisma.user.create({ data: { email: row.email as string, namaLengkap: (row.nama || row.name) as string, role: 'penguji', passwordHash } });
        imported++;
      } catch { /* skip duplicate email */ }
    }
    return { success: true, data: { imported, total: data.length } };
  }

  async assign(id: string, dto: AssignExaminerDto, scope?: UserScope) {
    const examiner = await this.prisma.user.findUnique({ where: { id, role: 'penguji' } });
    if (!examiner) throw new NotFoundException('Penguji tidak ditemukan');
    const kegiatanId = dto.kegiatanId || dto.graduationId;
    const kegiatan = await this.prisma.kegiatan.findUnique({ where: { id: kegiatanId } });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');

    // Scope verification: verify kegiatan is within scope
    if (scope) {
      this.scopeHelper.verifyKegiatanScope(scope, kegiatan.scopeType ?? undefined, kegiatan.scopeId ?? undefined);
    }

    const assignment = await this.prisma.penugasanPenguji.create({
      data: { pengujiUserId: id, kegiatanId: kegiatanId!, peran: dto.peran || 'penguji', catatan: dto.catatan },
    });
    return { success: true, data: assignment, message: 'Penguji berhasil ditugaskan' };
  }

  async getAssignments(id: string) {
    const assignments = await this.prisma.penugasanPenguji.findMany({
      where: { pengujiUserId: id },
      include: { kegiatan: { select: { id: true, nama: true, tipe: true, tanggalMulai: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: assignments };
  }

  async getSchedules(id: string) {
    const assignments = await this.prisma.penugasanPenguji.findMany({
      where: { pengujiUserId: id },
      include: { kegiatan: { select: { id: true, nama: true, tipe: true, tanggalMulai: true, tanggalSelesai: true, lokasi: true } } },
      orderBy: { kegiatan: { tanggalMulai: 'asc' } },
    });
    const schedules = assignments.filter(a => a.kegiatan.tanggalMulai >= new Date());
    return { success: true, data: schedules };
  }
}
