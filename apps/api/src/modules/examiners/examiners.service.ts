import { Injectable, NotFoundException } from '@nestjs/common';
import { MailService } from '../../mail/mail.service';
import { env } from '../../config/env.validation';
import { examinerWelcomeEmail, examinerAssignmentEmail } from '../../mail/email-templates';
import {
  CreateExaminerDto,
  UpdateExaminerDto,
  ExaminerFilterDto,
  AssignExaminerDto,
} from './dto/examiner.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import bcrypt from 'bcryptjs';

@Injectable()
export class ExaminersService extends BaseCrudService<CreateExaminerDto, UpdateExaminerDto> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scopeHelper: ScopeHelper,
    protected readonly cache: CacheService,
    private readonly mailService: MailService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'user',
      prefix: 'examiners:',
      notFound: 'Penguji tidak ditemukan',
    });
  }

  // ── Hook: transform DTO before create ────────────────────
  // bcrypt password, set role='penguji'

  protected async beforeCreate(
    dto: CreateExaminerDto,
  ): Promise<Record<string, unknown>> {
    const defaultPassword = dto.password || 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    return {
      email: dto.email,
      namaLengkap: dto.namaLengkap,
      role: 'penguji',
      passwordHash,
    };
  }

  // ── Hook: send welcome email after create ────────────────

  protected async afterCreate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: any,
    _dto: CreateExaminerDto,
  ): Promise<void> {
    const setPasswordUrl = `${env.frontendUrl}/forgot-password?email=${encodeURIComponent(result.email)}`;
    this.sendWelcomeEmail(result.email, result.namaLengkap, setPasswordUrl);
  }

  // ── Hook: transform DTO before update ────────────────────
  // Only include defined fields; bcrypt password if changed.

  protected async beforeUpdate(
    _id: string,
    dto: UpdateExaminerDto,
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.namaLengkap !== undefined) data.namaLengkap = dto.namaLengkap;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return data;
  }

  // ── CRUD: findAll ────────────────────────────────────────
  // Override to filter by role='penguji' + isActive

  async findAll(query: ExaminerFilterDto) {
    return this.baseFindAll(
      `examiners:list:${query.page || 1}:${query.limit || 10}:${query.search || ''}:${query.includeInactive ? 'all' : 'active'}`,
      async () => {
        const where: Record<string, unknown> = { role: 'penguji' };
        // Default: hanya penguji aktif. includeInactive=true → tampilkan juga nonaktif.
        if (!query.includeInactive) where.isActive = true;
        if (query.search) where.namaLengkap = { contains: query.search };
        return where;
      },
      {
        page: query.page,
        limit: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          namaLengkap: true,
          isActive: true,
          createdAt: true,
        },
      },
      30,
    );
  }

  // ── CRUD: findOne ────────────────────────────────────────
  // Override to filter by role='penguji'

  async findOne(id: string) {
    const examiner = await this.prismaDelegate.findUnique({
      where: { id, role: 'penguji' },
    });
    if (!examiner) throw new NotFoundException('Penguji tidak ditemukan');
    return examiner;
  }

  // ── CRUD: create ─────────────────────────────────────────

  async create(dto: CreateExaminerDto) {
    return this.baseCreate(dto, undefined, undefined, 'Penguji berhasil ditambahkan');
  }

  // ── CRUD: update ─────────────────────────────────────────

  async update(id: string, dto: UpdateExaminerDto) {
    return this.baseUpdate(id, dto, undefined, 'Data penguji diperbarui');
  }

  // ── CRUD: remove ─────────────────────────────────────────
  // Soft delete via isActive=false (not deletedAt)

  async remove(id: string) {
    const exists = await this.prismaDelegate.findUnique({
      where: { id, role: 'penguji' },
    });
    if (!exists) throw new NotFoundException('Penguji tidak ditemukan');

    await this.prismaDelegate.update({
      where: { id },
      data: { isActive: false },
    });
    this.invalidateCache();
    // void — interceptor returns { success: true }
  }

  // ── Domain: import CSV ───────────────────────────────────

  async importCsv(data: Record<string, unknown>[]) {
    let imported = 0;
    const defaultPassword = 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    for (const row of data) {
      try {
        const email = row.email as string;
        const nama = (row.nama || row.name) as string;
        await this.prismaDelegate.create({
          data: { email, namaLengkap: nama, role: 'penguji', passwordHash },
        });
        const setPasswordUrl = `${env.frontendUrl}/forgot-password?email=${encodeURIComponent(email)}`;
        this.sendWelcomeEmail(email, nama, setPasswordUrl);
        imported++;
      } catch {
        /* skip duplicate email */
      }
    }
    return { imported, total: data.length };
  }

  // ── Domain: assign examiner to kegiatan ──────────────────

  async assign(id: string, dto: AssignExaminerDto, scope?: UserScope) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const examiner = await (this.prisma as any).user.findUnique({
      where: { id, role: 'penguji' },
    });
    if (!examiner) throw new NotFoundException('Penguji tidak ditemukan');

    const kegiatanId = dto.kegiatanId || dto.graduationId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kegiatan = await (this.prisma as any).kegiatan.findUnique({
      where: { id: kegiatanId },
    });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');

    // Scope verification: verify kegiatan is within scope
    if (scope) {
      this.scopeHelper.verifyKegiatanScope(
        scope,
        kegiatan.scopeType ?? undefined,
        kegiatan.scopeId ?? undefined,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignment = await (this.prisma as any).penugasanPenguji.create({
      data: {
        pengujiUserId: id,
        kegiatanId: kegiatanId!,
        peran: dto.peran || 'penguji',
        catatan: dto.catatan,
      },
    });

    // Send assignment notification
    this.sendAssignmentEmail(examiner, kegiatan, dto.peran || 'penguji');

    return assignment;
  }

  // ── Domain: get assignments for an examiner ──────────────

  async getAssignments(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignments = await (this.prisma as any).penugasanPenguji.findMany({
      where: { pengujiUserId: id },
      include: {
        kegiatan: {
          select: { id: true, nama: true, tipe: true, tanggalMulai: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return assignments;
  }

  // ── Domain: get upcoming schedules for an examiner ───────

  async getSchedules(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignments = await (this.prisma as any).penugasanPenguji.findMany({
      where: { pengujiUserId: id },
      include: {
        kegiatan: {
          select: {
            id: true,
            nama: true,
            tipe: true,
            tanggalMulai: true,
            tanggalSelesai: true,
            lokasi: true,
          },
        },
      },
      orderBy: { kegiatan: { tanggalMulai: 'asc' } },
    });
    const schedules = assignments.filter((a: { kegiatan: { tanggalMulai: Date } }) => a.kegiatan.tanggalMulai >= new Date());
    return schedules;
  }

  // ── Private helpers ──────────────────────────────────────

  private sendWelcomeEmail(email: string, nama: string, setPasswordUrl: string) {
    this.mailService
      .renderWithOverride(
        'examinerWelcomeEmail',
        () => examinerWelcomeEmail(nama, email, setPasswordUrl),
        { nama, email, setPasswordUrl },
      )
      .then((tpl) =>
        this.mailService.sendMail({
          to: email,
          subject: tpl.subject,
          html: tpl.html,
          metadata: { module: 'examiners', template: 'examinerWelcomeEmail', email },
        }),
      )
      .catch(() => {
        this.logger.warn(`Failed to send welcome email to examiner ${email}`);
      });
  }

  private sendAssignmentEmail(
    examiner: { id: string; email: string; namaLengkap: string },
    kegiatan: { nama: string; tanggalMulai: Date | null },
    peran: string,
  ) {
    const tanggal = kegiatan.tanggalMulai
      ? kegiatan.tanggalMulai.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Akan ditentukan';

    this.mailService
      .renderWithOverride(
        'examinerAssignmentEmail',
        () => examinerAssignmentEmail(examiner.namaLengkap, kegiatan.nama, tanggal, peran),
        {
          nama: examiner.namaLengkap,
          kegiatanNama: kegiatan.nama,
          tanggal,
          peran,
        },
      )
      .then((tpl) =>
        this.mailService.sendMail({
          to: examiner.email,
          subject: tpl.subject,
          html: tpl.html,
          metadata: {
            module: 'examiners',
            template: 'examinerAssignmentEmail',
            examinerId: examiner.id,
          },
        }),
      )
      .catch(() => {
        this.logger.warn(`Failed to send assignment email to ${examiner.email}`);
      });
  }
}
