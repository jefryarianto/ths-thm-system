import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { welcomeMemberEmail, escapeHtml } from '../../mail/email-templates';
import { CreateMemberDto, UpdateMemberDto, MemberFilterDto } from './dto/member.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { CsvImportService } from '../../common/services/csv-import.service';
import { MemberMailService } from '../../common/services/member-mail.service';
import { NraService } from '../../common/services/nra.service';
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
    private readonly csvImportService: CsvImportService,
    private readonly memberMailService: MemberMailService,
    private readonly nraService: NraService,
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
    try {
      const member = await this.prisma.anggota.create({
        data: {
          ...dto,
          tanggalLahir: dto.tanggalLahir ? (() => { const d = new Date(dto.tanggalLahir); return isNaN(d.getTime()) ? undefined : d; })() : undefined,
          nomorAnggota: await this.nraService.generateMemberNumber(dto.rantingId || scope?.rantingId || ''),
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
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email sudah terdaftar sebagai anggota');
      }
      throw error;
    }
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
      data: {
        ...dto,
        tanggalLahir: dto.tanggalLahir ? (() => { const d = new Date(dto.tanggalLahir); return isNaN(d.getTime()) ? undefined : d; })() : undefined,
      } as any,
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

        // Support legacy import: accept existing member number from CSV
        const existingNumber = row.nomor_anggota || row.nomorAnggota || row.no_anggota;
        let nomorAnggota: string;
        if (existingNumber) {
          const rantingRow = rantingId
            ? await this.prisma.ranting.findUnique({
                where: { id: rantingId },
                select: { wilayah: { select: { distrik: { select: { kodeDistrik: true } } } } },
              })
            : null;
          const kodeDistrik = rantingRow?.wilayah?.distrik?.kodeDistrik?.replace(/^\D+/g, '') || '';
          nomorAnggota = kodeDistrik
            ? `${kodeDistrik}-${String(existingNumber).trim()}`
            : String(existingNumber).trim();
        } else {
          nomorAnggota = await this.nraService.generateMemberNumber(
            rantingId || '',
            row.tahun_dadar || row.tahunDadar || undefined,
          );
        }

        const member = await this.prisma.anggota.create({
          data: {
            nomorAnggota,
            namaLengkap: row.nama_lengkap || row.nama || row.name,
            jenisKelamin: row.jenis_kelamin || row.jenisKelamin || 'L',
            tempatLahir: row.tempat_lahir || row.tempatLahir || null,
            tanggalLahir: this.csvImportService.parseDateField(row.tanggal_lahir || row.tanggalLahir),
            tempatDadar: row.tempat_dadar || row.tempatDadar || null,
            tahunDadar: row.tahun_dadar || row.tahunDadar || null,
            fotoPath: row.foto || row.fotoPath || row.foto_path || null,
            noHp: row.no_hp || row.phone || null,
            email: row.email || null,
            alamat: row.alamat || row.address || null,
            rantingId: rantingId || undefined,
            tingkat: row.tingkat || row.tingkatan || null,
            statusData: missingFields.length > 0 ? 'incomplete' : 'complete',
            statusValidasi: 'pending',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            missingFields: missingFields.length > 0 ? (missingFields as any) : undefined,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        });

        // Intra-CSV duplicates tracked automatically by CsvImportService on success

        if (missingFields.length > 0) {
          // Kirim notifikasi data incomplete
          if (member.email) {
            this.memberMailService.sendToMember(
              member.id,
              (nama) => ({
                subject: 'Data Anggota Belum Lengkap — THS-THM',
                html: `<h2>Halo ${escapeHtml(nama)},</h2><p>Data keanggotaan Anda masih belum lengkap. Harap lengkapi data berikut:</p><ul>${missingFields.map((f: string) => `<li>${escapeHtml(f.replace(/_/g, ' '))}</li>`).join('')}</ul><p>Silakan login ke sistem untuk melengkapi data.</p>`,
                text: `Halo ${nama},\n\nData keanggotaan Anda masih belum lengkap. Harap lengkapi data berikut: ${missingFields.join(', ')}\n\nSilakan login ke sistem untuk melengkapi data.`,
              }),
              { template: 'dataIncompleteEmail', email: member.email },
              'members',
            );
          }
          // Incomplete rows counted separately by CsvImportService
          return { success: true, skip: true };
        }

        // Send welcome email
        if (member.email) {
          this.memberMailService.sendToMember(
            member.id,
            (nama) => welcomeMemberEmail(nama),
            { template: 'welcomeMemberEmail', email: member.email },
            'members',
          );
        }

        return { success: true };
      },
    });

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
      take: 10_000,
    });

    return { success: true, data: members };
  }

  async findByEmail(email: string) {
    const member = await this.prisma.anggota.findFirst({
      where: { email, deletedAt: null },
      include: {
        ranting: { include: { wilayah: { include: { distrik: true } } } },
      },
    });

    if (!member) {
      return { success: false, message: 'Anggota tidak ditemukan untuk email ini' };
    }

    return { success: true, data: member };
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private validateCsvRow(row: any): string[] {
    const required = ['nama', 'name', 'nama_lengkap', 'namaLengkap'];
    const missing: string[] = [];

    const hasName = required.some((field) => row[field]);
    if (!hasName) missing.push('nama');

    if (!row.jenis_kelamin && !row.jenisKelamin && !row.gender) missing.push('jenis_kelamin');

    return missing;
  }
}
