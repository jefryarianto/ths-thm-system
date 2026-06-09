import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { examinerWelcomeEmail, examinerAssignmentEmail } from '../../mail/email-templates';
import { CreateExaminerDto, UpdateExaminerDto, ExaminerFilterDto, AssignExaminerDto } from './dto/examiner.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import bcrypt from 'bcryptjs';

@Injectable()
export class ExaminersService {
  private readonly logger = new Logger(ExaminersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly mailService: MailService,
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
    const defaultPassword = dto.password || 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    const examiner = await this.prisma.user.create({ data: { email: dto.email, namaLengkap: dto.namaLengkap, role: 'penguji', passwordHash } });
    this.sendWelcomeEmail(examiner.email, examiner.namaLengkap, defaultPassword);
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
    const defaultPassword = 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    for (const row of data) {
      try {
        const email = row.email as string;
        const nama = (row.nama || row.name) as string;
        await this.prisma.user.create({ data: { email, namaLengkap: nama, role: 'penguji', passwordHash } });
        this.sendWelcomeEmail(email, nama, defaultPassword);
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

    // Send assignment notification
    this.sendAssignmentEmail(examiner, kegiatan, dto.peran || 'penguji');

    return { success: true, data: assignment, message: 'Penguji berhasil ditugaskan' };
  }

  private sendWelcomeEmail(email: string, nama: string, password: string) {
    const { subject, html } = examinerWelcomeEmail(nama, email, password);
    this.mailService.sendMail({ to: email, subject, html }).catch(() => {
      this.logger.warn(`Failed to send welcome email to examiner ${email}`);
    });
  }

  private sendAssignmentEmail(
    examiner: { id: string; email: string; namaLengkap: string },
    kegiatan: { nama: string; tanggalMulai: Date | null },
    peran: string,
  ) {
    const tanggal = kegiatan.tanggalMulai
      ? kegiatan.tanggalMulai.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'Akan ditentukan';

    const { subject, html } = examinerAssignmentEmail(examiner.namaLengkap, kegiatan.nama, tanggal, peran);
    this.mailService.sendMail({ to: examiner.email, subject, html }).catch(() => {
      this.logger.warn(`Failed to send assignment email to ${examiner.email}`);
    });
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
