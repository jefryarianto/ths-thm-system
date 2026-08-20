import { Injectable, NotFoundException, ConflictException, Optional, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { BaseCrudService, CrudConfig } from '../../common/utils/base-crud.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';
import { RevisionService } from '../../common/services/revision.service';
import { approvedMemberEmail, candidateRejectedEmail } from '../../mail/email-templates';
import { CreateCandidateDto, UpdateCandidateDto, CandidateFilterDto } from './dto/candidate.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { CsvImportService } from '../../common/services/csv-import.service';
import { MemberMailService } from '../../common/services/member-mail.service';
import { NraService } from '../../common/services/nra.service';
import { normalizePhone } from '../../common/utils/phone.util';
import { ImportBatchService } from '../imports/import-batch.service';

const CRUD_CONFIG: CrudConfig = {
  model: 'calonAnggota',
  prefix: 'candidates:',
  notFound: 'Calon anggota tidak ditemukan',
  softDelete: false,
};

@Injectable()
export class CandidatesService extends BaseCrudService<CreateCandidateDto, UpdateCandidateDto> implements OnModuleInit {
  constructor(
    prisma: PrismaService,
    scopeHelper: ScopeHelper,
    cache: CacheService,
    private readonly csvImportService: CsvImportService,
    private readonly memberMailService: MemberMailService,
    private readonly nraService: NraService,
    @Optional() protected readonly persistentAudit?: PersistentAuditService,
    @Optional() protected readonly revisions?: RevisionService,
    @Optional() private readonly importBatchService?: ImportBatchService,
  ) {
    super(prisma, scopeHelper, cache, CRUD_CONFIG, persistentAudit, revisions);
  }

  onModuleInit(): void {
    this.importBatchService?.registerProcessor('candidates', (row) =>
      this.importCandidateRow(row),
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  HOOKS — invoked automatically by base CRUD methods
  // ═══════════════════════════════════════════════════════════

  /**
   * Transform DTO → Prisma data before creation.
   * Handles auto-scope, date parsing, and field mapping.
   */
  protected async beforeCreate(
    dto: CreateCandidateDto,
    scope?: UserScope,
    userId?: string,
  ): Promise<Record<string, unknown>> {
    // Auto-assign rantingId from user scope
    const rantingId = dto.rantingId || scope?.rantingId;

    return {
      namaLengkap: dto.namaLengkap,
      jenisKelamin: dto.jenisKelamin,
      tempatLahir: dto.tempatLahir ?? null,
      tanggalLahir: dto.tanggalLahir
        ? (() => { const d = new Date(dto.tanggalLahir); return isNaN(d.getTime()) ? undefined : d; })()
        : undefined,
      alamat: dto.alamat ?? null,
      noHp: dto.noHp ?? null,
      email: dto.email ?? null,
      rantingId: rantingId ?? null,
      usulOlehUserId: userId || dto.usulOlehId || null,
      status: 'diusulkan',
    };
  }

  /**
   * Side-effect after successful creation.
   * Pattern: fire-and-forget async side effects — exceptions are caught
   * and logged, never propagated (won't fail the create transaction).
   *
   * ===== DEMO: Email + Notification via afterCreate hook =====
   *
   * Walaupun candidate create tidak kirim email (email dikirim saat
   * approve), berikut pola konkret untuk kirim in-app notification
   * + email setelah CREATE entity APAPUN:
   *
   * ```ts
   * protected async afterCreate(result: any, _dto: TCreateDto): Promise<void> {
   *   // 1. In-app notification (fire-and-forget):
   *   await this.notificationsService
   *     .send(result.id, {
   *       judul: 'Selamat Datang di THS-THM',
   *       isi: 'Data Anda telah terdaftar sebagai calon anggota',
   *       tipe: 'welcome',
   *     })
   *     .catch((e) => this.logger.warn('Notif gagal:', e.message));
   *
   *   // 2. Email (via MemberMailService):
   *   if (result.email) {
   *     await this.memberMailService
   *       .sendToMember(
   *         result.id,
   *         (nama) => ({ subject: 'Selamat Datang', html: `<p>Halo ${escapeHtml(nama)}!</p>` }),
   *         { template: 'welcomeCandidate', email: result.email },
   *         'candidates',
   *       )
   *       .catch((e) => this.logger.warn('Email gagal:', e.message));
   *   }
   * }
   * ```
   *
   * Catatan: NRA (Nomor Registrasi Anggota) TIDAK digenerate saat
   * pembuatan calon anggota. NRA baru digenerate saat approve() —
   * lihat method `approve()` di file ini untuk pola NRA.
   */
  protected async afterCreate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: any,
    _dto: CreateCandidateDto,
  ): Promise<void> {
    if (result?.email) {
      this.logger.log(`Candidate registered with email: ${result.email}`);

      // ── In-app notification (fire-and-forget pattern) ──
      // Uncomment after injecting NotificationsService:
      // this.notificationsService
      //   .send(result.id, {
      //     judul: 'Selamat Datang di THS-THM',
      //     isi: 'Data Anda telah terdaftar sebagai calon anggota',
      //     tipe: 'welcome',
      //   })
      //   .catch((e) => this.logger.warn('Welcome notif failed:', e.message));
    }
  }

  /**
   * Transform DTO → Prisma update data.
   * Handles date parsing for optional tanggalLahir.
   */
  protected async beforeUpdate(
    _id: string,
    dto: UpdateCandidateDto,
  ): Promise<Record<string, unknown>> {
    return {
      ...dto,
      tanggalLahir: dto.tanggalLahir
        ? (() => { const d = new Date(dto.tanggalLahir); return isNaN(d.getTime()) ? undefined : d; })()
        : undefined,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  STANDARD CRUD — thin wrappers
  // ═══════════════════════════════════════════════════════════

  async findAll(filter: CandidateFilterDto, scope?: UserScope) {
    const cacheKey = `${this.CACHE_PREFIX}list:${scope?.rantingId || 'all'}:${filter.page || 1}:${filter.limit || 10}:${filter.search || ''}:${filter.rantingId || ''}:${filter.status || ''}`;

    return this.baseFindAll(
      cacheKey,
      () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = this.buildScopeFilter(scope);

        if (filter.search) {
          where.OR = [
            { namaLengkap: { contains: filter.search, mode: 'insensitive' } },
            { email: { contains: filter.search, mode: 'insensitive' } },
          ];
        }
        if (filter.rantingId) where.rantingId = filter.rantingId;
        if (filter.status) where.status = filter.status;

        return where;
      },
      {
        page: filter.page,
        limit: filter.limit,
        orderBy: { createdAt: 'desc' },
        include: { ranting: true },
      },
      30_000,
    );
  }

  async findOne(id: string, scope?: UserScope) {
    return this.baseFindOne(id, scope, {
      ranting: { include: { wilayah: { include: { distrik: true } } } },
    });
  }

  async create(dto: CreateCandidateDto, scope?: UserScope, userId?: string) {
    try {
      // `baseCreate` calls `beforeCreate` internally for data transformation,
      // then `afterCreate` for side effects
      return await this.baseCreate(dto, scope, userId, 'Calon anggota berhasil ditambahkan');
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email sudah terdaftar sebagai calon anggota');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateCandidateDto, scope?: UserScope, userId?: string) {
    // `baseUpdate` calls `beforeUpdate` for date parsing, then verifies scope
    return this.baseUpdate(id, dto, scope, 'Data calon anggota berhasil diperbarui', userId);
  }

  async remove(id: string, scope?: UserScope) {
    return this.baseRemove(id, scope, 'Calon anggota berhasil dihapus');
  }

  // ═══════════════════════════════════════════════════════════
  //  DOMAIN METHODS — import, approve, reject, export
  // ═══════════════════════════════════════════════════════════

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async importCsv(data: any[]) {
    const results = await this.csvImportService.importRows(data, {
      module: 'candidates',
      duplicateTables: { anggota: true, calonAnggota: true },
      rowProcessor: async (row) => this.importCandidateRow(row),
    });

    this.invalidateCache();
    return results;
  }

  /**
   * Proses satu baris import calon anggota. Dipakai oleh importCsv (sinkron)
   * maupun impor massal asinkron (ImportBatchService).
   */
  async importCandidateRow(row: any) {
        // Server-side field validation
        const nameValue = (row.nama_lengkap || row.nama || row.name || '').trim();
        if (!nameValue) {
          return { success: false, error: 'Nama lengkap tidak boleh kosong' };
        }

        const jenisKelamin = row.jenis_kelamin || '';
        if (jenisKelamin && !['L', 'P'].includes(jenisKelamin.toUpperCase())) {
          return { success: false, error: `Jenis kelamin "${jenisKelamin}" tidak valid. Harus "L" atau "P".` };
        }

        const emailVal = (row.email || '').trim();
        if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
          return { success: false, error: `Format email "${emailVal}" tidak valid` };
        }

        const hpVal = (row.no_hp || row.phone || '').replace(/[\s\-().]/g, '');
        if (hpVal && !/^(\+?62|0)\d{8,13}$/.test(hpVal)) {
          return { success: false, error: `Format nomor HP "${row.no_hp || row.phone}" tidak valid (mulai 0/+62, 9-14 digit)` };
        }

        await this.prisma.calonAnggota.create({
          data: {
            namaLengkap: row.nama_lengkap || row.nama || row.name,
            jenisKelamin: row.jenis_kelamin || 'L',
            tempatLahir: row.tempat_lahir || null,
            tanggalLahir: this.csvImportService.parseDateField(row.tanggal_lahir),
            alamat: row.alamat || row.address,
            noHp: row.no_hp || row.phone,
            email: row.email,
            tingkat: row.tingkat || null,
            status: 'diusulkan',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            usulOlehId: row.usulOlehId || row.usul_oleh_id || 'seed',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rantingId: row.rantingId || row.ranting_id || 'seed',
          } as never,
        });

        return { success: true };
    }

  async validate(id: string) {
    const candidate = await this.prisma.calonAnggota.findUnique({ where: { id } });
    if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');
    return { valid: true, candidate };
  }

  async approve(id: string, dto?: { tempatDadar?: string; tahunDadar?: string; tingkat?: string }) {
    const candidate = await this.prisma.calonAnggota.findUnique({ where: { id } });
    if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');

    let member;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      member = await (this.prisma as any).$transaction(async (tx: any) => {
        const created = await tx.anggota.create({
          data: {
            namaLengkap: candidate.namaLengkap,
            jenisKelamin: candidate.jenisKelamin,
            tempatLahir: candidate.tempatLahir,
            tanggalLahir: candidate.tanggalLahir ?? null,
            tempatDadar: dto?.tempatDadar || null,
            tahunDadar: dto?.tahunDadar || null,
            alamat: candidate.alamat,
            noHp: candidate.noHp,
            noHpNormalized: normalizePhone(candidate.noHp),
            email: candidate.email,
            rantingId: candidate.rantingId,
            tingkat: dto?.tingkat || candidate.tingkat || null,
            nomorAnggota: await this.nraService.generateMemberNumber(candidate.rantingId, dto?.tahunDadar),
            statusKeanggotaan: 'aktif',
            statusData: 'complete',
            statusValidasi: 'approved',
          },
        });

        await tx.calonAnggota.update({
          where: { id },
          data: { status: 'lulus', tingkat: dto?.tingkat || candidate.tingkat },
        });

        return created;
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email calon anggota sudah terdaftar sebagai anggota tetap');
      }
      throw error;
    }

    // Send welcome email
    if (candidate.email) {
      this.memberMailService.sendToMemberWithArgs(
        member.id,
        approvedMemberEmail,
        [member.nomorAnggota],
        { template: 'approvedMemberEmail', email: candidate.email },
        'candidates',
        { nomorAnggota: member.nomorAnggota },
      );
    }

    this.invalidateCache();
    this.cache.invalidatePrefix('members:');
    this.audit('CANDIDATE_APPROVE', 'CalonAnggota', id, undefined, {
      memberId: member.id,
      nomorAnggota: member.nomorAnggota,
    });
    return member;
  }

  async reject(id: string, reason?: string) {
    const candidate = await this.prisma.calonAnggota.findUnique({ where: { id } });
    if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');

    await this.prisma.calonAnggota.update({
      where: { id },
      data: { status: 'dibatalkan' },
    });

    // Send rejection email
    if (candidate.email) {
      this.memberMailService.sendToMemberWithArgs(
        candidate.id,
        candidateRejectedEmail,
        [reason],
        { template: 'candidateRejectedEmail', email: candidate.email },
        'candidates',
        { alasan: reason || '' },
      );
    }

    this.invalidateCache();
    this.audit('CANDIDATE_REJECT', 'CalonAnggota', id, undefined, { reason });
    // void — interceptor returns { success: true }
  }

  async exportCsv(_filter: CandidateFilterDto, scope?: UserScope): Promise<string> {
    const scopeFilter = this.buildScopeFilter(scope);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { ...scopeFilter };

    if (_filter.search) {
      where.OR = [
        { namaLengkap: { contains: _filter.search, mode: 'insensitive' } },
        { email: { contains: _filter.search, mode: 'insensitive' } },
      ];
    }
    if (_filter.rantingId) where.rantingId = _filter.rantingId;
    if (_filter.status) where.status = _filter.status;

    const candidates = await this.prisma.calonAnggota.findMany({
      where,
      select: {
        namaLengkap: true,
        jenisKelamin: true,
        tempatLahir: true,
        tanggalLahir: true,
        alamat: true,
        noHp: true,
        email: true,
        tingkat: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'nama_lengkap',
      'jenis_kelamin',
      'tempat_lahir',
      'tanggal_lahir',
      'alamat',
      'no_hp',
      'email',
      'tingkat',
      'status',
    ];

    const csvRows = candidates.map((c) =>
      [
        this.escapeCsvField(c.namaLengkap),
        c.jenisKelamin,
        this.escapeCsvField(c.tempatLahir || ''),
        c.tanggalLahir ? c.tanggalLahir.toISOString().split('T')[0] : '',
        this.escapeCsvField(c.alamat || ''),
        c.noHp || '',
        c.email || '',
        c.tingkat || '',
        c.status,
      ].join(','),
    );

    return [headers.join(','), ...csvRows].join('\n');
  }

  private escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
