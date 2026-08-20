import { Injectable, ConflictException, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as crypto from 'crypto';
import { welcomeMemberEmail, escapeHtml } from '../../mail/email-templates';
import { CreateMemberDto, UpdateMemberDto, MemberFilterDto } from './dto/member.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { normalizePhone } from '../../common/utils/phone.util';
import { assertSelfMember, SelfScopeUser } from '../../common/utils/self-scope.helper';
import { CacheService } from '../../common/services/cache.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import { CsvImportService } from '../../common/services/csv-import.service';
import { MemberMailService } from '../../common/services/member-mail.service';
import { NraService } from '../../common/services/nra.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ApprovalService } from '../approvals/approval.service';
import bcrypt from 'bcryptjs';

/**
 * Password awal akun anggota yang dibuat/di-reset sistem.
 * Diambil dari env `DEFAULT_PASSWORD`; jika kosong:
 * - produksi → fallback nilai legacy (env.validation.ts sudah memberi warning agar diset)
 * - dev/test → acak sekali-jalan (lebih aman daripada konstanta publik yang ditebak)
 */
const DEFAULT_PASSWORD =
  process.env.DEFAULT_PASSWORD ||
  (process.env.NODE_ENV === 'production' ? 'thsthm123456' : crypto.randomBytes(6).toString('hex'));

@Injectable()
export class MembersService extends BaseCrudService<CreateMemberDto, UpdateMemberDto> {

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scopeHelper: ScopeHelper,
    protected readonly cache: CacheService,
    private readonly csvImportService: CsvImportService,
    private readonly memberMailService: MemberMailService,
    private readonly nraService: NraService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly approvalService?: ApprovalService,
    @Optional() protected readonly persistentAudit?: PersistentAuditService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'anggota',
      prefix: 'members:',
      notFound: 'Anggota tidak ditemukan',
      softDelete: true,
      scopeStrategy: 'ranting',
    }, persistentAudit);
  }

  // ── Hook: transform DTO before create ────────────────────
  // Assigns rantingId from scope, generates NRA, parses dates.

  protected async beforeCreate(
    dto: CreateMemberDto,
    scope?: UserScope,
  ): Promise<Record<string, unknown>> {
    const rantingId = dto.rantingId || scope?.rantingId;

    return {
      ...dto,
      rantingId,
      noHpNormalized: dto.noHp ? normalizePhone(dto.noHp) : null,
      tanggalLahir: dto.tanggalLahir
        ? parseDateSafe(dto.tanggalLahir)
        : undefined,
      nomorAnggota: await this.nraService.generateMemberNumber(
        rantingId || '',
        dto.tahunDadar || undefined,
      ),
      statusData: 'complete',
      statusValidasi: 'pending',
    };
  }

  // ── Hook: side-effect after create ────────────────────────
  // Sends welcome email if member has an email address.

  protected async afterCreate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: any,
    _dto: CreateMemberDto,
  ): Promise<void> {
    if (result?.email) {
      this.memberMailService.sendToMember(
        result.id,
        (nama: string) => welcomeMemberEmail(nama),
        { template: 'welcomeMemberEmail', email: result.email },
        'members',
      );
    }
  }

  // ── Hook: transform DTO before update ────────────────────
  // Only includes fields that are defined, parses tanggalLahir.

  protected async beforeUpdate(
    _id: string,
    dto: UpdateMemberDto,
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    if (dto.namaLengkap !== undefined) data.namaLengkap = dto.namaLengkap;
    if (dto.jenisKelamin !== undefined) data.jenisKelamin = dto.jenisKelamin;
    if (dto.tempatLahir !== undefined) data.tempatLahir = dto.tempatLahir;
    if (dto.tanggalLahir !== undefined) {
      data.tanggalLahir = parseDateSafe(dto.tanggalLahir);
    }
    if (dto.tempatDadar !== undefined) data.tempatDadar = dto.tempatDadar;
    if (dto.tahunDadar !== undefined) data.tahunDadar = dto.tahunDadar;
    if (dto.alamat !== undefined) data.alamat = dto.alamat;
    if (dto.noHp !== undefined) {
      data.noHp = dto.noHp;
      data.noHpNormalized = normalizePhone(dto.noHp);
    }
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.tingkat !== undefined) data.tingkat = dto.tingkat;
    if (dto.rantingId !== undefined) data.rantingId = dto.rantingId;
    if (dto.fotoPath !== undefined) data.fotoPath = dto.fotoPath;
    return data;
  }

  // ── CRUD: findAll ────────────────────────────────────────
  // Override for custom caching key + search/filter + deletedAt + hierarchical filters.

  async findAll(filter: MemberFilterDto, scope?: UserScope) {
    const cacheKey = `members:list:${scope?.rantingId || 'all'}:${filter.page || 1}:${filter.limit || 10}:${filter.search || ''}:${filter.rantingId || ''}:${filter.statusKeanggotaan || ''}:${filter.statusValidasi || ''}:${filter.statusData || ''}:${filter.wilayahId || ''}:${filter.distrikId || ''}:${filter.tanpaFoto || ''}`;

    return this.baseFindAll(
      cacheKey,
      async () => {
        const scopeFilter = this.buildScopeFilter(scope);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { deletedAt: null, ...scopeFilter };

        if (filter.search) {
          where.OR = [
            { namaLengkap: { contains: filter.search, mode: 'insensitive' } },
            { nomorAnggota: { contains: filter.search, mode: 'insensitive' } },
            { email: { contains: filter.search, mode: 'insensitive' } },
            { noHp: { contains: filter.search, mode: 'insensitive' } },
            { alamat: { contains: filter.search, mode: 'insensitive' } },
            { tingkat: { contains: filter.search, mode: 'insensitive' } },
          ];
        }
        if (filter.tanpaFoto === 'true') where.fotoPath = null;
        if (filter.rantingId) where.rantingId = filter.rantingId;
        if (filter.statusKeanggotaan) where.statusKeanggotaan = filter.statusKeanggotaan;
        if (filter.statusValidasi) where.statusValidasi = filter.statusValidasi;
        if (filter.statusData) where.statusData = filter.statusData;

        // Hierarchical filters: distrikId → wilayahId → rantingId
        if (filter.distrikId) {
          where.ranting = { wilayah: { distrikId: filter.distrikId } };
        }
        if (filter.wilayahId) {
          // If distrikId is also set, merge both
          const rantingWhere: any = { wilayahId: filter.wilayahId };
          if (filter.distrikId) {
            rantingWhere.wilayah = { distrikId: filter.distrikId };
          }
          where.ranting = rantingWhere;
        }

        return where;
      },
      {
        page: filter.page,
        limit: filter.limit,
        orderBy: { createdAt: 'desc' },
        include: { ranting: { include: { wilayah: { include: { distrik: true } } } } },
      },
      30,
    );
  }

  // ── CRUD: findOne ────────────────────────────────────────
  // Override for custom includes + deletedAt filter.

  async findOne(id: string, scope?: UserScope) {
    // Use prismaDelegate directly to pass deletedAt in where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const member = await (this.prisma as any).anggota.findUnique({
      where: { id, deletedAt: null },
      include: {
        ranting: { include: { wilayah: { include: { distrik: true } } } },
        dokumen: true,
        iuran: true,
      },
    });
    if (!member) {
      throw new NotFoundException('Anggota tidak ditemukan');
    }

    if (scope) {
      await this.verifyScope(id, scope);
    }

    return member;
  }

  // ── CRUD: create (with P2002 handling) ───────────────────

  async create(dto: CreateMemberDto, scope?: UserScope) {
    try {
      return await this.baseCreate(dto, scope, undefined, 'Anggota berhasil ditambahkan');
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email sudah terdaftar sebagai anggota');
      }
      throw error;
    }
  }

  // ── CRUD: update ─────────────────────────────────────────
  // After update, recalculate missing fields and trigger approval if data changed.

  async update(id: string, dto: UpdateMemberDto, scope?: UserScope) {
    const result = await this.baseUpdate(id, dto, scope, 'Data anggota berhasil diperbarui');

    // Recalculate missing fields and trigger approval workflow
    await this.handlePostUpdate(id, scope);

    return result;
  }

  // ── CRUD: remove (soft delete via config) ────────────────

  async remove(id: string, scope?: UserScope) {
    return this.baseRemove(id, scope, 'Anggota berhasil dihapus');
  }

  // ── Domain: import CSV ───────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async importCsv(data: any[], scope?: UserScope) {
    const results = await this.csvImportService.importRows(data, {
      module: 'members',
      duplicateTables: { anggota: true, calonAnggota: true, anggotaDeletedFilter: true },
      rowProcessor: async (row, helpers) => {
        const missingFields = this.validateCsvRow(row);

        // Normalize ranting: accept ranting_id from CSV
        let rantingId = row.ranting_id || row.rantingId || '';
        if (!rantingId && scope?.rantingId) {
          rantingId = scope.rantingId;
        }

        // ── PRAKONDISI: struktur organisasi (distrik → wilayah → ranting) wajib ada ──
        if (!rantingId) {
          return {
            success: false,
            error:
              'ranting_id wajib diisi. Import struktur organisasi (distrik → wilayah → ranting) terlebih dahulu.',
          };
        }

        const rantingRow = await this.prisma.ranting.findUnique({
          where: { id: rantingId },
          select: {
            id: true,
            nama: true,
            kodeRanting: true,
            wilayah: {
              select: { id: true, kodeWilayah: true, distrik: { select: { id: true, kodeDistrik: true, nama: true } } },
            },
          },
        });

        if (!rantingRow) {
          return {
            success: false,
            error: `Ranting "${rantingId}" tidak ditemukan. Import struktur organisasi (distrik → wilayah → ranting) terlebih dahulu.`,
          };
        }

        // Verify scope: user must have access to this ranting
        if (scope && !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, rantingId))) {
          return {
            success: false,
            error: `Akses ditolak: ranting "${rantingRow.nama}" diluar cakupan wilayah Anda.`,
          };
        }

        const kodeDistrik = rantingRow?.wilayah?.distrik?.kodeDistrik?.split('-').pop()?.trim() || '';
        const kodeWilayah = (rantingRow?.wilayah?.kodeWilayah?.split('-').pop() || '').padStart(2, '0');
        const kodeRanting = (rantingRow?.kodeRanting?.split('-').pop() || '').padStart(2, '0');

        if (!kodeDistrik || !kodeWilayah || !kodeRanting) {
          return {
            success: false,
            error: `Struktur organisasi ranting "${rantingRow.nama}" belum lengkap (kode distrik/wilayah/ranting kosong). Lengkapi data organisasi terlebih dahulu.`,
          };
        }

        // Support legacy import: accept existing member number from CSV.
        const existingNumber = row.nomor_anggota || row.nomorAnggota || row.no_anggota || row.nia;
        let nomorAnggota: string;

        // Smart Parsing for historical/legacy formats (TTL and Dadar)
        // 1. Parse TTL (Tempat, Tanggal Lahir) - e.g., "Larantuka, 23 Desember 2026"
        const rawTtl = row.ttl || row.tempat_tanggal_lahir;
        let parsedTempatLahir = row.tempat_lahir || row.tempatLahir;
        let parsedTanggalLahir = row.tanggal_lahir || row.tanggalLahir;

        if (rawTtl && !parsedTempatLahir && !parsedTanggalLahir) {
          const ttlParts = String(rawTtl).split(',');
          if (ttlParts.length >= 2) {
            parsedTempatLahir = ttlParts[0].trim();
            parsedTanggalLahir = ttlParts[1].trim();
          }
        }

        // 2. Parse Tempat & Tahun Dadar - e.g., "Larantuka - 2021"
        const rawDadar = row.tempat_dan_tahun_dadar || row.dadar;
        let parsedTempatDadar = row.tempat_dadar || row.tempatDadar;
        let parsedTahunDadar = row.tahun_dadar || row.tahunDadar;

        if (rawDadar && !parsedTempatDadar && !parsedTahunDadar) {
          const dadarParts = String(rawDadar).split('-');
          if (dadarParts.length >= 2) {
            parsedTempatDadar = dadarParts[0].trim();
            parsedTahunDadar = dadarParts[1].trim();
          } else {
            // Fallback: search for 4-digit year
            const yearMatch = String(rawDadar).match(/\d{4}/);
            if (yearMatch) {
              parsedTahunDadar = yearMatch[0];
              parsedTempatDadar = String(rawDadar).replace(yearMatch[0], '').trim().replace(/^-|-$/g, '');
            }
          }
        }

        if (existingNumber) {
          const legacyParts = String(existingNumber).trim().split('-');
          const urut = legacyParts[legacyParts.length - 2] || '';
          const tahun = legacyParts[legacyParts.length - 1] || '';
          nomorAnggota =
            kodeDistrik && kodeWilayah && kodeRanting && urut && tahun
              ? `${kodeDistrik}-${kodeWilayah}${kodeRanting}-${urut}-${tahun}`
              : String(existingNumber).trim();
        } else {
          nomorAnggota = await this.nraService.generateMemberNumber(
            rantingId,
            row.tahun_dadar || row.tahunDadar || undefined,
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const member = await (this.prisma as any).anggota.create({
          data: {
            nomorAnggota,
            namaLengkap: row.nama_lengkap || row.nama || row.name,
            jenisKelamin: row.jenis_kelamin || row.jenisKelamin || 'L',
            tempatLahir: parsedTempatLahir || null,
            tanggalLahir: this.csvImportService.parseDateField(parsedTanggalLahir),
            tempatDadar: parsedTempatDadar || null,
            tahunDadar: parsedTahunDadar ? parseInt(String(parsedTahunDadar), 10) : null,
            fotoPath: row.foto || row.fotoPath || row.foto_path || null,
            noHp: row.no_hp || row.phone || null,
            noHpNormalized: normalizePhone(row.no_hp || row.phone),
            email: row.email || null,
            alamat: row.alamat || row.address || null,
            rantingId,
            tingkat: row.tingkat || row.tingkatan || null,
            statusData: missingFields.length > 0 ? 'incomplete' : 'complete',
            statusValidasi: 'pending',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            missingFields: missingFields.length > 0 ? (missingFields as any) : undefined,
            isImported: true,
            importSource: row.import_source || row.importSource || 'csv_import',
            importedAt: new Date(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        });

        // Peringatan non-blocking: nomor HP sudah terdaftar untuk anggota lain
        const normalizedPhone = normalizePhone(row.no_hp || row.phone);
        const existingWithPhone = normalizedPhone
          ? await this.prisma.anggota.findFirst({
              where: { noHpNormalized: normalizedPhone, deletedAt: null },
              select: { id: true, nomorAnggota: true },
            })
          : null;
        const dupPhoneWarning =
          existingWithPhone && existingWithPhone.id !== member.id
            ? `Nomor HP ${row.no_hp || row.phone} sudah terdaftar untuk anggota ${existingWithPhone.nomorAnggota || existingWithPhone.id}.`
            : undefined;

        // Auto-create User account for the imported member
        if (member.email) {
          await this.autoCreateUser(member.email, member.namaLengkap, member.rantingId, member.noHp, member.id);
        } else if (member.noHp) {
          // Anggota tanpa email tapi punya noHP: buat akun dengan email sintetis
          // supaya User model tetap valid (email NOT NULL). Login via No. HP.
          const syntheticEmail = `${member.noHp}@noemail.ths-thm.org`;
          await this.autoCreateUser(syntheticEmail, member.namaLengkap, member.rantingId, member.noHp, member.id);
        }

        // Send notifications for incomplete data
        if (missingFields.length > 0) {
          await this.sendIncompleteDataNotification(member.id, member.email, member.namaLengkap, missingFields);

          return { success: true, skip: true, missingFields, warning: dupPhoneWarning };
        }

        // Send welcome email for complete data
        if (member.email) {
          this.memberMailService.sendToMember(
            member.id,
            (nama: string) => welcomeMemberEmail(nama),
            { template: 'welcomeMemberEmail', email: member.email },
            'members',
          );
        }

        return { success: true, warning: dupPhoneWarning };
      },
    });

    this.invalidateCache();
    this.audit('MEMBER_IMPORT', 'Anggota', 'bulk', undefined, {
      success: results.success,
      errors: results.errors,
      warnings: results.warnings,
    });
    return results;
  }

  // ── Domain: export CSV ───────────────────────────────────

  async exportCsv(filter: MemberFilterDto, scope?: UserScope) {
    const scopeFilter = this.buildScopeFilter(scope);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const members = await (this.prisma as any).anggota.findMany({
      where: { deletedAt: null, ...scopeFilter },
      select: {
        nomorAnggota: true,
        namaLengkap: true,
        jenisKelamin: true,
        tempatLahir: true,
        tanggalLahir: true,
        alamat: true,
        noHp: true,
        email: true,
        statusKeanggotaan: true,
        tingkat: true,
      },
      take: 10_000,
    });

    return members;
  }

  // ── Domain: findByEmail ──────────────────────────────────

  /**
   * Cari anggota milik user yang login. Prioritas cocokkan via email persis;
   * bila tidak ketemu, fallback via nama lengkap — khusus untuk anggota yang
   * email-nya kosong (mis. hasil import CSV tanpa kolom email) dan hanya bila
   * hasilnya UNIK (hindari salah taut bila ada nama kembar).
   */
  async findByEmail(email: string, namaLengkap?: string) {
    const include = {
      ranting: { include: { wilayah: { include: { distrik: true } } } },
    };

    // Prioritas 1: akun terhubung ke anggota via email.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const member = await (this.prisma as any).anggota.findFirst({
      where: { email, deletedAt: null },
      include,
    });
    if (member) return member;

    // Prioritas 2 (fallback nama): hanya untuk anggota ber-email kosong & hasil unik.
    if (namaLengkap && namaLengkap.trim()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const byName = await (this.prisma as any).anggota.findMany({
        where: {
          namaLengkap: { equals: namaLengkap.trim(), mode: 'insensitive' },
          OR: [{ email: null }, { email: '' }],
          deletedAt: null,
        },
        include,
      });
      if (byName.length === 1) return byName[0];
    }

    throw new NotFoundException('Anggota tidak ditemukan untuk email ini');
  }

  // ── Domain: resend credentials ────────────────────────────
  // Buat (jika belum ada) / reset akun User anggota ke password default,
  // wajibkan ganti password, lalu kirim ulang credential via email.

  async resendCredentials(memberId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const member = await (this.prisma as any).anggota.findUnique({
      where: { id: memberId },
      select: { id: true, email: true, noHp: true, namaLengkap: true, rantingId: true },
    });
    if (!member) throw new NotFoundException('Anggota tidak ditemukan');

    if (!member.email && !member.noHp) {
      throw new BadRequestException('Anggota tidak memiliki email atau nomor HP');
    }

    const phone = member.noHp || undefined;
    const email = member.email || (phone ? `${phone}@noemail.ths-thm.org` : null);

    // Cari akun yang sudah ada: via email (asli/sintetis) atau phone
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let user: any = email ? await this.prisma.user.findUnique({ where: { email } }) : null;
    if (!user && phone) {
      user = await this.prisma.user.findUnique({ where: { phone } });
    }

    if (!user) {
      // Belum punya akun — auto-create (sudah set mustChangePassword: true)
      if (email) {
        await this.autoCreateUser(email, member.namaLengkap, member.rantingId, phone, member.id);
      }
    } else {
      // Akun sudah ada — reset password ke default + wajibkan ganti password
      const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: true },
      });
    }

    // Kirim email credential — hanya untuk anggota ber-email asli
    if (member.email) {
      this.memberMailService.sendToMember(
        member.id,
        () => ({
          subject: 'Kredensial Login THS-THM',
          html: `<h2>Halo ${escapeHtml(member.namaLengkap)},</h2><p>Akun Anda telah diatur ulang di sistem THS-THM.</p><p>Silakan login dengan:</p><ul><li><strong>Email:</strong> ${escapeHtml(member.email)}</li><li><strong>Password:</strong> ${DEFAULT_PASSWORD}</li></ul><p>Setelah login, Anda akan diminta mengubah password.</p>`,
          text: `Halo ${member.namaLengkap},\n\nAkun Anda telah diatur ulang di sistem THS-THM.\n\nSilakan login dengan:\nEmail: ${member.email}\nPassword: ${DEFAULT_PASSWORD}\n\nSetelah login, Anda akan diminta mengubah password.`,
        }),
        { template: 'welcomeAccountEmail', email: member.email },
        'members',
      );
    }

    return { success: true, message: 'Credential berhasil dikirim ulang' };
  }

  // ── Domain: getDocuments ─────────────────────────────────

  async getDocuments(id: string, user?: SelfScopeUser) {
    // Anggota hanya boleh ambil dokumen miliknya sendiri
    await assertSelfMember(this.prisma as any, user, id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documents = await (this.prisma as any).dokumen.findMany({
      where: { anggotaId: id },
      orderBy: { createdAt: 'desc' },
    });

    return documents;
  }

  // ── Domain: getDues ──────────────────────────────────────

  async getDues(id: string, user?: SelfScopeUser) {
    // Anggota hanya boleh ambil iuran miliknya sendiri
    await assertSelfMember(this.prisma as any, user, id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dues = await (this.prisma as any).iuran.findMany({
      where: { anggotaId: id },
      orderBy: { createdAt: 'desc' },
    });

    return dues;
  }

  // ── Domain: search members for picker ─────────────────────

  async searchMembers(q?: string, rantingId?: string, wilayahId?: string) {
    const where: any = { deletedAt: null, statusKeanggotaan: 'aktif' };

    if (rantingId) where.rantingId = rantingId;
    if (wilayahId) where.ranting = { wilayahId };

    if (q && q.length >= 2) {
      where.OR = [
        { namaLengkap: { contains: q, mode: 'insensitive' } },
        { nomorAnggota: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const members = await (this.prisma as any).anggota.findMany({
      where,
      select: {
        id: true,
        namaLengkap: true,
        nomorAnggota: true,
        email: true,
        rantingId: true,
        statusData: true,
        statusValidasi: true,
        ranting: {
          select: { id: true, nama: true, wilayah: { select: { id: true, nama: true } } },
        },
      },
      take: 20,
      orderBy: { namaLengkap: 'asc' },
    });

    return members;
  }

  // ── Domain: get incomplete members ─────────────────────────

  async getIncompleteMembers(filter: MemberFilterDto, scope?: UserScope) {
    const cacheKey = `members:incomplete:${scope?.rantingId || 'all'}:${filter.page || 1}:${filter.limit || 10}:${filter.rantingId || ''}:${filter.wilayahId || ''}:${filter.distrikId || ''}`;

    return this.baseFindAll(
      cacheKey,
      async () => {
        const scopeFilter = this.buildScopeFilter(scope);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { deletedAt: null, statusData: 'incomplete', ...scopeFilter };

        if (filter.rantingId) where.rantingId = filter.rantingId;
        if (filter.distrikId) where.ranting = { wilayah: { distrikId: filter.distrikId } };
        if (filter.wilayahId) {
          const rantingWhere: any = { wilayahId: filter.wilayahId };
          if (filter.distrikId) rantingWhere.wilayah = { distrikId: filter.distrikId };
          where.ranting = rantingWhere;
        }

        return where;
      },
      {
        page: filter.page,
        limit: filter.limit,
        orderBy: { updatedAt: 'desc' },
        include: { ranting: { include: { wilayah: { include: { distrik: true } } } } },
      },
      30,
    );
  }

  // ── Domain: get incomplete data statistics ──────────────────

  async getIncompleteStats(scope?: UserScope) {
    const scopeFilter = this.buildScopeFilter(scope);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseWhere: any = { deletedAt: null, ...scopeFilter };

    const [totalMembers, incompleteMembers, importedMembers, importedIncomplete] = await Promise.all([
      (this.prisma as any).anggota.count({ where: baseWhere }),
      (this.prisma as any).anggota.count({ where: { ...baseWhere, statusData: 'incomplete' } }),
      (this.prisma as any).anggota.count({ where: { ...baseWhere, isImported: true } }),
      (this.prisma as any).anggota.count({ where: { ...baseWhere, isImported: true, statusData: 'incomplete' } }),
    ]);

    // Get breakdown by ranting (for admin scope)
    const rantingBreakdown = await (this.prisma as any).anggota.groupBy({
      by: ['rantingId'],
      where: { ...baseWhere, statusData: 'incomplete' },
      _count: { id: true },
    });

    const rantingIds = rantingBreakdown.map((r: any) => r.rantingId);
    const rantings = await this.prisma.ranting.findMany({
      where: { id: { in: rantingIds } },
      select: { id: true, nama: true, wilayah: { select: { id: true, nama: true, distrik: { select: { id: true, nama: true } } } } },
    });

    const rantingMap = new Map(rantings.map((r) => [r.id, r]));

    const breakdownByRanting = rantingBreakdown.map((r: any) => ({
      ranting: rantingMap.get(r.rantingId),
      count: r._count.id,
    }));

    // Get breakdown by missing field
    const incompleteWithFields = await (this.prisma as any).anggota.findMany({
      where: { ...baseWhere, statusData: 'incomplete' },
      select: { missingFields: true },
    });

    const fieldCounts: Record<string, number> = {};
    for (const member of incompleteWithFields) {
      const fields = member.missingFields || [];
      for (const field of fields) {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      }
    }

    const breakdownByField = Object.entries(fieldCounts)
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalMembers,
      incompleteMembers,
      completeMembers: totalMembers - incompleteMembers,
      completenessRate: totalMembers > 0 ? ((totalMembers - incompleteMembers) / totalMembers * 100).toFixed(1) : '0',
      importedMembers,
      importedIncomplete,
      breakdownByRanting,
      breakdownByField,
    };
  }

  // ── Public: recalculate missing fields for a member ──────────
  // Used after profile update to determine if data is complete.

  async recalculateMissingFields(anggotaId: string): Promise<{ statusData: string; missingFields: string[] }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const member = await (this.prisma as any).anggota.findUnique({
      where: { id: anggotaId },
      select: {
        namaLengkap: true,
        jenisKelamin: true,
        tempatLahir: true,
        tanggalLahir: true,
        tempatDadar: true,
        tahunDadar: true,
        alamat: true,
        noHp: true,
        email: true,
        tingkat: true,
      },
    });

    if (!member) throw new NotFoundException('Anggota tidak ditemukan');

    const missingFields: string[] = [];
    if (!member.namaLengkap) missingFields.push('nama_lengkap');
    if (!member.jenisKelamin) missingFields.push('jenis_kelamin');
    if (!member.tempatLahir) missingFields.push('tempat_lahir');
    if (!member.tanggalLahir) missingFields.push('tanggal_lahir');
    if (!member.tempatDadar) missingFields.push('tempat_dadar');
    if (!member.tahunDadar) missingFields.push('tahun_dadar');
    if (!member.alamat) missingFields.push('alamat');
    if (!member.noHp) missingFields.push('no_hp');
    if (!member.email) missingFields.push('email');
    if (!member.tingkat) missingFields.push('tingkat');

    const statusData = missingFields.length > 0 ? 'incomplete' : 'complete';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma as any).anggota.update({
      where: { id: anggotaId },
      data: {
        statusData,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        missingFields: missingFields.length > 0 ? (missingFields as any) : undefined,
      },
    });

    return { statusData, missingFields };
  }

  // ── Private: handle post-update logic ──────────────────────
  // Recalculates missing fields and triggers approval if data changed.

  private async handlePostUpdate(anggotaId: string, scope?: UserScope): Promise<void> {
    try {
      const { statusData, missingFields } = await this.recalculateMissingFields(anggotaId);

      // Only trigger approval if data is now complete (was incomplete before)
      if (statusData === 'complete') {
        // Set statusValidasi to pending for approval
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.prisma as any).anggota.update({
          where: { id: anggotaId },
          data: { statusValidasi: 'pending' },
        });

        // Submit approval request
        if (this.approvalService) {
          await this.approvalService.submit(
            { requestType: 'member_update', itemId: anggotaId },
            'system',
            scope,
          );
        }
      } else if (missingFields.length > 0) {
        // Still incomplete, send notification reminder
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const member = await (this.prisma as any).anggota.findUnique({
          where: { id: anggotaId },
          select: { email: true, namaLengkap: true },
        });

        if (member) {
          await this.sendIncompleteDataNotification(anggotaId, member.email, member.namaLengkap, missingFields);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to handle post-update for member ${anggotaId}: ${(error as Error).message}`);
    }
  }

  // ── Private: auto-create User account ──────────────────────

  private async autoCreateUser(
    email: string,
    namaLengkap: string,
    rantingId: string,
    phone?: string,
    anggotaId?: string,
  ): Promise<void> {
    try {
      // Check if user already exists (via email atau phone)
      const existingUser = await this.prisma.user.findUnique({ where: { email } });
      if (existingUser) return;

      if (phone) {
        const existingByPhone = await this.prisma.user.findUnique({ where: { phone } });
        if (existingByPhone) return;
      }

      const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

      await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          namaLengkap,
          role: 'anggota',
          rantingId,
          isActive: true,
          phone: phone || null,
          mustChangePassword: true,
        },
      });

      // Email sintetis (08xxx@noemail.ths-thm.org) tidak valid untuk pengiriman —
      // credential anggota tanpa email hanya ditampilkan via admin (Kirim Ulang Credential).
      const isSynthetic = email.endsWith('@noemail.ths-thm.org');

      // Kirim email credential — hanya jika anggota punya email asli
      if (anggotaId && !isSynthetic) {
        this.memberMailService.sendToMember(
          anggotaId,
          () => ({
            subject: 'Akun THS-THM Telah Dibuat',
            html: `<h2>Halo ${escapeHtml(namaLengkap)},</h2><p>Akun Anda telah dibuat di sistem THS-THM.</p><p>Silakan login dengan:</p><ul><li><strong>Email:</strong> ${escapeHtml(email)}</li><li><strong>Password:</strong> ${DEFAULT_PASSWORD}</li></ul><p>Setelah login, Anda akan diminta mengubah password.</p>`,
            text: `Halo ${namaLengkap},\n\nAkun Anda telah dibuat di sistem THS-THM.\n\nSilakan login dengan:\nEmail: ${email}\nPassword: ${DEFAULT_PASSWORD}\n\nSetelah login, Anda akan diminta mengubah password.`,
          }),
          { template: 'welcomeAccountEmail', email },
          'members',
        );
      }

      this.logger.log(`Auto-created user account for ${email}`);
    } catch (error) {
      this.logger.error(`Failed to auto-create user for ${email}: ${(error as Error).message}`);
    }
  }

  // ── Private: send incomplete data notification ─────────────

  private async sendIncompleteDataNotification(
    anggotaId: string,
    email: string | null,
    namaLengkap: string,
    missingFields: string[],
  ): Promise<void> {
    // Send email notification
    if (email) {
      this.memberMailService.sendToMember(
        anggotaId,
        (nama: string) => ({
          subject: 'Data Anggota Belum Lengkap — THS-THM',
          html: `<h2>Halo ${escapeHtml(nama)},</h2><p>Data keanggotaan Anda masih belum lengkap. Harap lengkapi data berikut:</p><ul>${missingFields.map((f: string) => `<li>${escapeHtml(f.replace(/_/g, ' '))}</li>`).join('')}</ul><p>Silakan login ke aplikasi mobile untuk melengkapi data.</p>`,
          text: `Halo ${nama},\n\nData keanggotaan Anda masih belum lengkap. Harap lengkapi data berikut: ${missingFields.join(', ')}\n\nSilakan login ke aplikasi mobile untuk melengkapi data.`,
        }),
        { template: 'dataIncompleteEmail', email },
        'members',
      );
    }

    // Send in-app + FCM push notification via NotificationsService
    if (this.notificationsService) {
      // Find the user by email to get userId
      if (email) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (user) {
          this.notificationsService.send(user.id, {
            judul: '📋 Data Anggota Belum Lengkap',
            isi: `Halo ${escapeHtml(namaLengkap)}, silakan lengkapi data berikut: ${missingFields.map((f) => f.replace(/_/g, ' ')).join(', ')}`,
            tipe: 'data_incomplete',
            data: {
              screen: 'profile/edit',
              anggotaId,
              missingFields,
            },
          }).catch((err) => this.logger.error(`Failed to send incomplete data notification: ${err.message}`));
        }
      }
    }
  }

  // ── Private helpers ──────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private validateCsvRow(row: any): string[] {
    const missing: string[] = [];

    // Required: nama
    const hasName = ['nama', 'name', 'nama_lengkap', 'namaLengkap'].some((field) => row[field]);
    if (!hasName) missing.push('nama');

    // Required: jenis_kelamin
    if (!row.jenis_kelamin && !row.jenisKelamin && !row.gender) missing.push('jenis_kelamin');

    // Optional but tracked: other fields
    if (!row.tempat_lahir && !row.tempatLahir) missing.push('tempat_lahir');
    if (!row.tanggal_lahir && !row.tanggalLahir) missing.push('tanggal_lahir');
    if (!row.tempat_dadar && !row.tempatDadar) missing.push('tempat_dadar');
    if (!row.tahun_dadar && !row.tahunDadar) missing.push('tahun_dadar');
    if (!row.alamat && !row.address) missing.push('alamat');
    if (!row.no_hp && !row.phone) missing.push('no_hp');
    if (!row.email) missing.push('email');
    if (!row.tingkat && !row.tingkatan) missing.push('tingkat');

    return missing;
  }
}

/**
 * Safely parse a date string — returns undefined for invalid dates.
 */
function parseDateSafe(value: string): Date | undefined {
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}