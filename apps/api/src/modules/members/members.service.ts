import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { welcomeMemberEmail } from '../../mail/email-templates';
import { CreateMemberDto, UpdateMemberDto, MemberFilterDto } from './dto/member.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { MemberMailService } from '../../common/services/member-mail.service';
import { paginate } from '../../common/utils/pagination';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);
  private readonly CACHE_PREFIX = 'members:';
  private readonly CACHE_TTL = 30_000; // 30 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly cache: CacheService,
    private readonly memberMailService: MemberMailService,
  ) {}

  async findAll(filter: MemberFilterDto, scope?: UserScope) {
    const cacheKey = `${this.CACHE_PREFIX}list:${scope?.rantingId || 'all'}:${filter.page || 1}:${filter.limit || 10}:${filter.search || ''}:${filter.rantingId || ''}:${filter.statusKeanggotaan || ''}:${filter.statusValidasi || ''}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const scopeFilter = this.scopeHelper.buildScopeFilter(scope || {});
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { deletedAt: null, ...scopeFilter };

        if (filter.search) {
          where.OR = [
            { namaLengkap: { contains: filter.search } },
            { nomorAnggota: { contains: filter.search } },
            { email: { contains: filter.search } },
          ];
        }
        if (filter.rantingId) where.rantingId = filter.rantingId;
        if (filter.statusKeanggotaan) where.statusKeanggotaan = filter.statusKeanggotaan;
        if (filter.statusValidasi) where.statusValidasi = filter.statusValidasi;

        return paginate(this.prisma.anggota, where, {
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
    const member = await this.prisma.anggota.findUnique({
      where: { id, deletedAt: null },
      include: {
        ranting: { include: { wilayah: { include: { distrik: true } } } },
        dokumen: true,
        iuran: true,
      },
    });

    if (!member) throw new NotFoundException('Anggota tidak ditemukan');

    // Verify scope access (async for region/district hierarchy check)
    if (
      scope &&
      !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, member.rantingId))
    ) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }

    return { success: true, data: member };
  }

  async create(dto: CreateMemberDto, scope?: UserScope) {
    // Auto-assign rantingId from scope for branch-level users
    if (scope?.rantingId && !dto.rantingId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dto as any).rantingId = scope.rantingId;
    }
    const member = await this.prisma.anggota.create({
      data: {
        ...dto,
        nomorAnggota: await this.generateMemberNumber(),
        statusData: 'complete',
        statusValidasi: 'pending',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    // Send welcome email if email address is provided
    if (member.email) {
      this.memberMailService.sendToMember(
        member.id,
        (nama) => welcomeMemberEmail(nama),
        { template: 'welcomeMemberEmail', email: member.email },
        'members',
      );
    }

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: member, message: 'Anggota berhasil ditambahkan' };
  }

  async update(id: string, dto: UpdateMemberDto, scope?: UserScope) {
    await this.scopeHelper.verifyResourceAccess(
      this.prisma,
      scope,
      id,
      (prisma, rid) =>
        prisma.anggota.findUnique({ where: { id: rid }, select: { rantingId: true } }),
      'Anggota tidak ditemukan',
    );

    const updated = await this.prisma.anggota.update({
      where: { id },
      data: dto,
    });

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: updated, message: 'Data anggota berhasil diperbarui' };
  }

  async remove(id: string, scope?: UserScope) {
    await this.scopeHelper.verifyResourceAccess(
      this.prisma,
      scope,
      id,
      (prisma, rid) =>
        prisma.anggota.findUnique({ where: { id: rid }, select: { rantingId: true } }),
      'Anggota tidak ditemukan',
    );

    await this.prisma.anggota.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, message: 'Anggota berhasil dihapus' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async importCsv(data: any[], _scope?: UserScope) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = { success: 0, incomplete: 0, errors: 0, details: [] as any[] };

    for (const row of data) {
      try {
        const missingFields = this.validateCsvRow(row);

        const member = await this.prisma.anggota.create({
          data: {
            namaLengkap: row.nama || row.name,
            jenisKelamin: row.jenis_kelamin || 'L',
            noHp: row.no_hp || row.phone,
            email: row.email,
            alamat: row.alamat || row.address,
            nomorAnggota: await this.generateMemberNumber(),
            statusData: missingFields.length > 0 ? 'incomplete' : 'complete',
            statusValidasi: 'pending',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            missingFields: missingFields.length > 0 ? (missingFields as any) : undefined,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        });

        if (missingFields.length > 0) {
          results.incomplete++;
          results.details.push({ row, missingFields, memberId: member.id });
        } else {
          results.success++;
        }

        // Send welcome email if email is provided
        if (member.email) {
          this.memberMailService.sendToMember(
            member.id,
            (nama) => welcomeMemberEmail(nama),
            { template: 'welcomeMemberEmail', email: member.email },
            'members',
          );
        }
      } catch (error) {
        results.errors++;
        results.details.push({ row, error: (error as Error).message });
      }
    }

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: results };
  }

  async exportCsv(filter: MemberFilterDto, scope?: UserScope) {
    const scopeFilter = this.scopeHelper.buildScopeFilter(scope || {});
    const members = await this.prisma.anggota.findMany({
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
    });

    return { success: true, data: members };
  }

  async validate(id: string) {
    const member = await this.prisma.anggota.findUnique({ where: { id } });

    if (!member) throw new NotFoundException('Anggota tidak ditemukan');

    const missingFields: string[] = [];
    if (!member.namaLengkap) missingFields.push('nama_lengkap');
    if (!member.jenisKelamin) missingFields.push('jenis_kelamin');

    if (missingFields.length > 0) {
      await this.prisma.anggota.update({
        where: { id },
        data: { statusData: 'incomplete', missingFields },
      });
      return { success: true, data: { valid: false, missingFields } };
    }

    await this.prisma.anggota.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { statusData: 'complete', missingFields: undefined as any },
    });

    return { success: true, data: { valid: true } };
  }

  async approve(id: string) {
    await this.prisma.anggota.update({
      where: { id },
      data: { statusValidasi: 'approved', statusKeanggotaan: 'aktif' },
    });

    return { success: true, message: 'Anggota berhasil disetujui' };
  }

  async suspend(id: string) {
    await this.prisma.anggota.update({
      where: { id },
      data: { statusKeanggotaan: 'nonaktif' },
    });

    return { success: true, message: 'Anggota berhasil ditangguhkan' };
  }

  async reactivate(id: string) {
    await this.prisma.anggota.update({
      where: { id },
      data: { statusKeanggotaan: 'aktif' },
    });

    return { success: true, message: 'Anggota berhasil diaktifkan kembali' };
  }

  async getDocuments(id: string) {
    const documents = await this.prisma.dokumen.findMany({
      where: { anggotaId: id },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: documents };
  }

  async getDues(id: string) {
    const dues = await this.prisma.iuran.findMany({
      where: { anggotaId: id },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: dues };
  }

  private async generateMemberNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.anggota.count();
    return `THS-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private validateCsvRow(row: any): string[] {
    const required = ['nama', 'name'];
    const missing: string[] = [];

    const hasName = required.some((field) => row[field]);
    if (!hasName) missing.push('nama');

    if (!row.jenis_kelamin && !row.gender) missing.push('jenis_kelamin');

    return missing;
  }
}
