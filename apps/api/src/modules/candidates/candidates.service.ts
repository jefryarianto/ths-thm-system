import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { approvedMemberEmail, candidateRejectedEmail } from '../../mail/email-templates';
import { CreateCandidateDto, UpdateCandidateDto, CandidateFilterDto } from './dto/candidate.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { MemberMailService } from '../../common/services/member-mail.service';
import { NraService } from '../../common/services/nra.service';
import { paginate } from '../../common/utils/pagination';

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);
  private readonly CACHE_PREFIX = 'candidates:';
  private readonly CACHE_TTL = 30_000;
  private readonly MAX_IMPORT_ROWS = 500;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly cache: CacheService,
    private readonly memberMailService: MemberMailService,
    private readonly nraService: NraService,
  ) {}

  async findAll(filter: CandidateFilterDto, scope?: UserScope) {
    const cacheKey = `${this.CACHE_PREFIX}list:${scope?.rantingId || 'all'}:${filter.page || 1}:${filter.limit || 10}:${filter.search || ''}:${filter.rantingId || ''}:${filter.status || ''}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const scopeFilter = this.scopeHelper.buildScopeFilter(scope || {});
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { ...scopeFilter };

        if (filter.search) {
          where.OR = [
            { namaLengkap: { contains: filter.search } },
            { email: { contains: filter.search } },
          ];
        }
        if (filter.rantingId) where.rantingId = filter.rantingId;
        if (filter.status) where.status = filter.status;

        return paginate(this.prisma.calonAnggota, where, {
          page: filter.page,
          limit: filter.limit,
          orderBy: { createdAt: 'desc' },
          include: { ranting: true },
        });
      },
      this.CACHE_TTL,
    );
  }

  async findOne(id: string, scope?: UserScope) {
    const candidate = await this.prisma.calonAnggota.findUnique({
      where: { id },
      include: { ranting: { include: { wilayah: { include: { distrik: true } } } } },
    });

    if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');

    if (
      scope &&
      !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, candidate.rantingId))
    ) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }

    return { success: true, data: candidate };
  }

  async create(dto: CreateCandidateDto, scope?: UserScope, userId?: string) {
    if (scope?.rantingId && !dto.rantingId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dto as any).rantingId = scope.rantingId;
    }
    const candidate = await this.prisma.calonAnggota.create({
      data: {
        namaLengkap: dto.namaLengkap,
        jenisKelamin: dto.jenisKelamin,
        tempatLahir: dto.tempatLahir,
        tanggalLahir: dto.tanggalLahir,
        alamat: dto.alamat,
        noHp: dto.noHp,
        email: dto.email,
        rantingId: dto.rantingId,
        usulOlehUserId: userId || dto.usulOlehId,
        status: 'diusulkan',
      } as never,
    });

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: candidate, message: 'Calon anggota berhasil ditambahkan' };
  }

  async update(id: string, dto: UpdateCandidateDto, scope?: UserScope) {
    await this.scopeHelper.verifyResourceAccess(
      this.prisma,
      scope,
      id,
      (prisma, rid) =>
        prisma.calonAnggota.findUnique({ where: { id: rid }, select: { rantingId: true } }),
      'Calon anggota tidak ditemukan',
    );

    const updated = await this.prisma.calonAnggota.update({
      where: { id },
      data: dto,
    });

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: updated, message: 'Data calon anggota berhasil diperbarui' };
  }

  async remove(id: string, scope?: UserScope) {
    await this.scopeHelper.verifyResourceAccess(
      this.prisma,
      scope,
      id,
      (prisma, rid) =>
        prisma.calonAnggota.findUnique({ where: { id: rid }, select: { rantingId: true } }),
      'Calon anggota tidak ditemukan',
    );

    await this.prisma.calonAnggota.delete({ where: { id } });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, message: 'Calon anggota berhasil dihapus' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async importCsv(data: any[]) {
    if (data.length > this.MAX_IMPORT_ROWS) {
      throw new BadRequestException(`Maksimal ${this.MAX_IMPORT_ROWS} baris data per import. File Anda memiliki ${data.length} baris.`);
    }

    const results: {
      success: number;
      errors: number;
      details: Array<{ row: unknown; error: string }>;
    } = { success: 0, errors: 0, details: [] };

    // Collect all emails and names to check duplicates in batch
    const emails = data
      .map((row) => row.email?.trim()?.toLowerCase())
      .filter(Boolean) as string[];
    const names = data
      .map((row) => (row.nama_lengkap || row.nama || row.name || '').trim().toLowerCase())
      .filter(Boolean);

    let existingEmails = new Set<string>();
    let existingNames = new Set<string>();

    // Batch query for existing emails
    if (emails.length > 0) {
      const [existingAnggota, existingCalon] = await Promise.all([
        this.prisma.anggota.findMany({
          where: { email: { in: emails, mode: 'insensitive' } },
          select: { email: true },
        }),
        this.prisma.calonAnggota.findMany({
          where: { email: { in: emails, mode: 'insensitive' } },
          select: { email: true },
        }),
      ]);
      const allEmails: string[] = [
        ...existingAnggota.map((a) => a.email?.toLowerCase() || ''),
        ...existingCalon.map((c) => c.email?.toLowerCase() || ''),
      ].filter(Boolean);
      existingEmails = new Set(allEmails);
    }

    // Batch query for existing names
    if (names.length > 0) {
      const [existingAnggotaNames, existingCalonNames] = await Promise.all([
        this.prisma.anggota.findMany({
          where: { namaLengkap: { in: names, mode: 'insensitive' } },
          select: { namaLengkap: true },
        }),
        this.prisma.calonAnggota.findMany({
          where: { namaLengkap: { in: names, mode: 'insensitive' } },
          select: { namaLengkap: true },
        }),
      ]);
      const allNames: string[] = [
        ...existingAnggotaNames.map((a) => a.namaLengkap?.toLowerCase() || ''),
        ...existingCalonNames.map((c) => c.namaLengkap?.toLowerCase() || ''),
      ].filter(Boolean);
      existingNames = new Set(allNames);
    }

    for (const row of data) {
      try {
        const email = row.email?.trim()?.toLowerCase();
        const namaLengkap = (row.nama_lengkap || row.nama || row.name || '').trim().toLowerCase();

        // Check duplicate email
        if (email && existingEmails.has(email)) {
          results.errors++;
          results.details.push({
            row,
            error: `Email "${row.email}" sudah terdaftar sebagai anggota atau calon anggota`,
          });
          continue;
        }

        // Check duplicate name
        if (namaLengkap && existingNames.has(namaLengkap)) {
          results.errors++;
          results.details.push({
            row,
            error: `Nama "${row.nama_lengkap || row.nama || row.name}" sudah terdaftar sebagai anggota atau calon anggota`,
          });
          continue;
        }

        // Server-side field validation
        const nameValue = (row.nama_lengkap || row.nama || row.name || '').trim();
        if (!nameValue) {
          results.errors++;
          results.details.push({ row, error: 'Nama lengkap tidak boleh kosong' });
          continue;
        }

        const jenisKelamin = row.jenis_kelamin || '';
        if (jenisKelamin && !['L', 'P'].includes(jenisKelamin.toUpperCase())) {
          results.errors++;
          results.details.push({ row, error: `Jenis kelamin "${jenisKelamin}" tidak valid. Harus "L" atau "P".` });
          continue;
        }

        const emailVal = (row.email || '').trim();
        if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
          results.errors++;
          results.details.push({ row, error: `Format email "${emailVal}" tidak valid` });
          continue;
        }

        const hpVal = (row.no_hp || row.phone || '').replace(/[\s-]/g, '');
        if (hpVal && !/^(\+?62|0)\d{8,13}$/.test(hpVal)) {
          results.errors++;
          results.details.push({ row, error: `Format nomor HP "${row.no_hp || row.phone}" tidak valid (mulai 0/+62, 9-14 digit)` });
          continue;
        }

        await this.prisma.calonAnggota.create({
          data: {
            namaLengkap: row.nama_lengkap || row.nama || row.name,
            jenisKelamin: row.jenis_kelamin || 'L',
            tempatLahir: row.tempat_lahir || null,
            tanggalLahir: row.tanggal_lahir ? new Date(row.tanggal_lahir) : null,
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
        results.success++;
      } catch (error) {
        results.errors++;
        results.details.push({ row, error: (error as Error).message });
      }
    }

    this.cache.invalidatePrefix(this.CACHE_PREFIX);

    // Log import for audit trail
    if (results.success > 0 || results.errors > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.prisma as any).importLog.create({
        data: {
          module: 'candidates',
          totalRows: data.length,
          successRows: results.success,
          errorRows: results.errors,
          details: results.details.length > 0 ? results.details.slice(0, 100) : undefined,
        },
      }).catch((err: Error) => this.logger.warn('Failed to write import log:', err.message));
    }

    return { success: true, data: results };
  }

  async validate(id: string) {
    const candidate = await this.prisma.calonAnggota.findUnique({ where: { id } });
    if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');

    return { success: true, data: { valid: true, candidate } };
  }

  async approve(id: string, dto?: { tempatDadar?: string; tahunDadar?: string; tingkat?: string }) {
    const candidate = await this.prisma.calonAnggota.findUnique({ where: { id } });

    if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');

    const member = await this.prisma.anggota.create({
      data: {
        namaLengkap: candidate.namaLengkap,
        jenisKelamin: candidate.jenisKelamin,
        tempatLahir: candidate.tempatLahir,
        tanggalLahir: candidate.tanggalLahir,
        tempatDadar: dto?.tempatDadar || null,
        tahunDadar: dto?.tahunDadar || null,
        alamat: candidate.alamat,
        noHp: candidate.noHp,
        email: candidate.email,
        rantingId: candidate.rantingId,
        tingkat: dto?.tingkat || candidate.tingkat || null,
        nomorAnggota: await this.nraService.generateMemberNumber(candidate.rantingId, dto?.tahunDadar),
        statusKeanggotaan: 'aktif',
        statusData: 'complete',
        statusValidasi: 'approved',
      },
    });

    await this.prisma.calonAnggota.update({
      where: { id },
      data: { status: 'lulus', tingkat: dto?.tingkat || candidate.tingkat },
    });

    // Send welcome email if email address is provided
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

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    this.cache.invalidatePrefix('members:');
    return { success: true, data: member, message: 'Calon anggota disetujui dan menjadi anggota' };
  }

  async reject(id: string, reason?: string) {
    const candidate = await this.prisma.calonAnggota.findUnique({ where: { id } });

    if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');

    await this.prisma.calonAnggota.update({
      where: { id },
      data: { status: 'dibatalkan' },
    });

    // Send rejection email if email address is provided
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

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, message: reason || 'Calon anggota ditolak' };
  }

  async exportCsv(_filter: CandidateFilterDto, scope?: UserScope): Promise<string> {
    const scopeFilter = this.scopeHelper.buildScopeFilter(scope || {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { ...scopeFilter };

    if (_filter.search) {
      where.OR = [
        { namaLengkap: { contains: _filter.search } },
        { email: { contains: _filter.search } },
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

    // Generate CSV string
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
