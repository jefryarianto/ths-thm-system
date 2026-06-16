import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { approvedMemberEmail, candidateRejectedEmail } from '../../mail/email-templates';
import { CreateCandidateDto, UpdateCandidateDto, CandidateFilterDto } from './dto/candidate.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { MemberMailService } from '../../common/services/member-mail.service';
import { paginate } from '../../common/utils/pagination';

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);
  private readonly CACHE_PREFIX = 'candidates:';
  private readonly CACHE_TTL = 30_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly cache: CacheService,
    private readonly memberMailService: MemberMailService,
  ) {}

  async findAll(filter: CandidateFilterDto, scope?: UserScope) {
    const cacheKey = `${this.CACHE_PREFIX}list:${scope?.rantingId || 'all'}:${filter.page || 1}:${filter.limit || 10}:${filter.search || ''}:${filter.rantingId || ''}:${filter.status || ''}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const scopeFilter = this.scopeHelper.buildScopeFilter(scope || {});
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

  async importCsv(data: any[]) {
    const results = { success: 0, errors: 0, details: [] as any[] };

    for (const row of data) {
      try {
        await this.prisma.calonAnggota.create({
          data: {
            namaLengkap: row.nama || row.name,
            jenisKelamin: row.jenis_kelamin || 'L',
            noHp: row.no_hp || row.phone,
            email: row.email,
            alamat: row.alamat || row.address,
            status: 'diusulkan',
            usulOlehId: row.usulOlehId || row.usul_oleh_id || 'seed',
            rantingId: row.rantingId || row.ranting_id || 'seed',
          } as any,
        });
        results.success++;
      } catch (error) {
        results.errors++;
        results.details.push({ row, error: (error as Error).message });
      }
    }

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: results };
  }

  async validate(id: string) {
    const candidate = await this.prisma.calonAnggota.findUnique({ where: { id } });
    if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');

    return { success: true, data: { valid: true, candidate } };
  }

  async approve(id: string) {
    const candidate = await this.prisma.calonAnggota.findUnique({ where: { id } });

    if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');

    const member = await this.prisma.anggota.create({
      data: {
        namaLengkap: candidate.namaLengkap,
        jenisKelamin: candidate.jenisKelamin,
        tempatLahir: candidate.tempatLahir,
        tanggalLahir: candidate.tanggalLahir,
        alamat: candidate.alamat,
        noHp: candidate.noHp,
        email: candidate.email,
        rantingId: candidate.rantingId,
        nomorAnggota: await this.generateMemberNumber(),
        statusKeanggotaan: 'aktif',
        statusData: 'complete',
        statusValidasi: 'approved',
      },
    });

    await this.prisma.calonAnggota.update({
      where: { id },
      data: { status: 'lulus' },
    });

    // Send welcome email if email address is provided
    if (candidate.email) {
      this.memberMailService.sendToMemberWithArgs(
        member.id,
        approvedMemberEmail,
        [member.nomorAnggota],
        { template: 'approvedMemberEmail', email: candidate.email },
        'candidates',
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
      );
    }

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, message: reason || 'Calon anggota ditolak' };
  }

  async exportCsv(filter: CandidateFilterDto) {
    const candidates = await this.prisma.calonAnggota.findMany({
      where: {},
      select: {
        namaLengkap: true,
        jenisKelamin: true,
        tempatLahir: true,
        tanggalLahir: true,
        alamat: true,
        noHp: true,
        email: true,
        status: true,
      },
    });

    return { success: true, data: candidates };
  }

  private async generateMemberNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.anggota.count();
    return `THS-${year}-${String(count + 1).padStart(4, '0')}`;
  }
}
