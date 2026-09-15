import { Injectable, NotFoundException, Optional, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { registrationApprovedEmail, registrationRejectedEmail } from '../../mail/email-templates';
import {
  CreateRegistrationDto,
  UpdateRegistrationDto,
  RegistrationFilterDto,
} from './dto/registration.dto';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';

@Injectable()
export class RegistrationsService extends BaseCrudService<CreateRegistrationDto, UpdateRegistrationDto> {
  constructor(
    prisma: PrismaService,
    scopeHelper: ScopeHelper,
    cache: CacheService,
    private readonly mailService: MailService,
    @Optional() protected readonly persistentAudit?: PersistentAuditService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'pendaftaran',
      prefix: 'registrations:',
      notFound: 'Pendaftaran tidak ditemukan',
      // No scope strategy — registrations are not scoped to ranting
    }, persistentAudit);
  }

  // ── Hooks ──────────────────────────────────────────────

  protected async beforeCreate(dto: CreateRegistrationDto): Promise<Record<string, unknown>> {
    return {
      ...dto,
      status: 'pending',
    };
  }

  protected async beforeUpdate(_id: string, dto: UpdateRegistrationDto): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    if (dto.namaLengkap !== undefined) data.namaLengkap = dto.namaLengkap;
    if (dto.jenisKelamin !== undefined) data.jenisKelamin = dto.jenisKelamin;
    if (dto.tempatLahir !== undefined) data.tempatLahir = dto.tempatLahir;
    if (dto.tanggalLahir !== undefined) data.tanggalLahir = dto.tanggalLahir;
    if (dto.alamat !== undefined) data.alamat = dto.alamat;
    if (dto.noHp !== undefined) data.noHp = dto.noHp;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.sumberInfo !== undefined) data.sumberInfo = dto.sumberInfo;
    if (dto.rantingId !== undefined) data.rantingId = dto.rantingId;
    return data;
  }

  // ── CRUD overrides ─────────────────────────────────────

  async findAll(query: RegistrationFilterDto) {
    return this.baseFindAll(
      `registrations:${JSON.stringify(query)}`,
      async () => {
        const where: Record<string, unknown> = {};
        if (query.status) where.status = query.status;
        return where;
      },
      {
        page: query.page,
        limit: query.limit,
        orderBy: { createdAt: 'desc' },
      },
    );
  }

  async findOne(id: string) {
    return this.baseFindOne(id);
  }

  async create(dto: CreateRegistrationDto) {
    // ── Cegah duplikat: tolak jika email/noHp sudah ada di User / Anggota / CalonAnggota aktif ──
    if (dto.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: dto.email },
        select: { id: true },
      });
      if (existingUser) {
        throw new ConflictException('Email sudah terdaftar sebagai akun pengguna');
      }

      const existingAnggota = await this.prisma.anggota.findFirst({
        where: { email: dto.email, deletedAt: null },
        select: { id: true },
      });
      if (existingAnggota) {
        throw new ConflictException('Email sudah terdaftar sebagai anggota');
      }
    }

    if (dto.noHp) {
      const normalized = dto.noHp.replace(/[\s\-()]/g, '');
      const existingAnggotaByNoHp = await this.prisma.anggota.findFirst({
        where: { noHpNormalized: normalized, deletedAt: null },
        select: { id: true },
      });
      if (existingAnggotaByNoHp) {
        throw new ConflictException('Nomor HP sudah terdaftar sebagai anggota');
      }
    }

    // Cek pendaftaran sebelumnya yang masih pending dengan email/noHp sama
    const existingPending = await this.prisma.pendaftaran.findFirst({
      where: {
        status: 'pending',
        OR: [
          ...(dto.email ? [{ email: dto.email }] : []),
          ...(dto.noHp ? [{ noHp: dto.noHp }] : []),
        ],
      },
      select: { id: true },
    });
    if (existingPending) {
      throw new ConflictException('Anda sudah memiliki pendaftaran yang sedang diproses');
    }

    return this.baseCreate(dto, undefined, undefined, 'Pendaftaran berhasil dibuat');
  }

  async update(id: string, dto: UpdateRegistrationDto) {
    return this.baseUpdate(id, dto, undefined, 'Pendaftaran berhasil diperbarui');
  }

  async remove(id: string) {
    return this.baseRemove(id, undefined, 'Pendaftaran berhasil dihapus');
  }

  // ── Domain Methods ─────────────────────────────────────

  async verify(id: string) {
    const reg = await this.prismaDelegate.findUnique({ where: { id } });
    if (!reg) throw new NotFoundException('Pendaftaran tidak ditemukan');

    const missing: string[] = [];
    if (!reg.namaLengkap) missing.push('nama_lengkap');
    if (!reg.jenisKelamin) missing.push('jenis_kelamin');
    if (missing.length > 0) {
      return { valid: false, missingFields: missing };
    }
    return { valid: true };
  }

  async approve(id: string, userId?: string) {
    const reg = await this.prismaDelegate.findUnique({ where: { id } });
    if (!reg) throw new NotFoundException('Pendaftaran tidak ditemukan');

    const rantingId = (reg as Record<string, unknown>).rantingId as string | null | undefined;
    if (!rantingId || rantingId.trim() === '') {
      throw new BadRequestException(
        'Pendaftaran belum memiliki ranting asal — lengkapi data ranting sebelum menyetujui',
      );
    }

    // `usulOlehUserId` wajib (FK ke User). JANGAN fallback ke reg.id —
    // reg.id adalah ID pendaftaran, bukan ID user (akan melanggar FK).
    if (!userId) {
      throw new BadRequestException('Sesi admin tidak valid — silakan login ulang');
    }

    const candidate = await this.prisma.calonAnggota.create({
      data: {
        rantingId: rantingId,
        namaLengkap: reg.namaLengkap,
        jenisKelamin: reg.jenisKelamin,
        tempatLahir: reg.tempatLahir,
        tanggalLahir: reg.tanggalLahir,
        alamat: reg.alamat,
        noHp: reg.noHp,
        email: reg.email,
        status: 'diusulkan',
        usulOlehUserId: userId,
      },
    });

    await this.prismaDelegate.update({ where: { id }, data: { status: 'approved' } });
    this.invalidateCache();

    // Send confirmation email if email address is provided
    if (reg.email) {
      this.sendRegistrationApprovedEmail(reg.namaLengkap, reg.email).catch((err) =>
        this.logger.error(`Registration approved email failed for ${reg.email}: ${err.message}`),
      );
    }

    return candidate;
  }

  async reject(id: string, reason?: string) {
    const reg = await this.prismaDelegate.findUnique({ where: { id } });
    if (!reg) throw new NotFoundException('Pendaftaran tidak ditemukan');

    await this.prismaDelegate.update({
      where: { id },
      data: { status: 'rejected', catatan: reason },
    });
    this.invalidateCache();

    // Send rejection email if email address is provided
    if (reg.email) {
      this.sendRegistrationRejectedEmail(reg.namaLengkap, reg.email, reason).catch((err) =>
        this.logger.error(`Registration rejected email failed for ${reg.email}: ${err.message}`),
      );
    }

    // void — interceptor returns { success: true }
  }

  async importCsv(data: Record<string, unknown>[]) {
    let imported = 0;
    for (const row of data) {
      try {
        await this.prismaDelegate.create({
          data: {
            namaLengkap: (row.nama_lengkap || row.name) as string,
            jenisKelamin: (row.jenis_kelamin as string) || 'L',
            noHp: row.no_hp as string,
            email: row.email as string,
            alamat: row.alamat as string,
            sumberInfo: row.sumber_info as string,
            status: 'pending',
          },
        });
        imported++;
      } catch {
        /* skip */
      }
    }
    return { imported, total: data.length };
  }

  // ── Email Helpers ──────────────────────────────────────

  private async sendRegistrationApprovedEmail(nama: string, email: string): Promise<void> {
    const tpl = await this.mailService.renderWithOverride(
      'registrationApprovedEmail',
      () => registrationApprovedEmail(nama),
      { nama },
    );
    await this.mailService.sendMail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
      metadata: { module: 'registrations', template: 'registrationApprovedEmail', email },
    });
  }

  private async sendRegistrationRejectedEmail(
    nama: string,
    email: string,
    reason?: string,
  ): Promise<void> {
    const tpl = await this.mailService.renderWithOverride(
      'registrationRejectedEmail',
      () => registrationRejectedEmail(nama, reason),
      { nama, alasan: reason || '' },
    );
    await this.mailService.sendMail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
      metadata: { module: 'registrations', template: 'registrationRejectedEmail', email },
    });
  }
}
