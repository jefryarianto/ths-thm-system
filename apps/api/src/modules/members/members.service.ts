import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { welcomeMemberEmail, escapeHtml } from '../../mail/email-templates';
import { CreateMemberDto, UpdateMemberDto, MemberFilterDto } from './dto/member.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import { CsvImportService } from '../../common/services/csv-import.service';
import { MemberMailService } from '../../common/services/member-mail.service';
import { NraService } from '../../common/services/nra.service';

@Injectable()
export class MembersService extends BaseCrudService<CreateMemberDto, UpdateMemberDto> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scopeHelper: ScopeHelper,
    protected readonly cache: CacheService,
    private readonly csvImportService: CsvImportService,
    private readonly memberMailService: MemberMailService,
    private readonly nraService: NraService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'anggota',
      prefix: 'members:',
      notFound: 'Anggota tidak ditemukan',
      softDelete: true,
      scopeStrategy: 'ranting',
    });
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
    if (dto.noHp !== undefined) data.noHp = dto.noHp;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.tingkat !== undefined) data.tingkat = dto.tingkat;
    if (dto.rantingId !== undefined) data.rantingId = dto.rantingId;
    if (dto.fotoPath !== undefined) data.fotoPath = dto.fotoPath;
    return data;
  }

  // ── CRUD: findAll ────────────────────────────────────────
  // Override for custom caching key + search/filter + deletedAt.

  async findAll(filter: MemberFilterDto, scope?: UserScope) {
    const cacheKey = `members:list:${scope?.rantingId || 'all'}:${filter.page || 1}:${filter.limit || 10}:${filter.search || ''}:${filter.rantingId || ''}:${filter.statusKeanggotaan || ''}:${filter.statusValidasi || ''}`;

    return this.baseFindAll(
      cacheKey,
      async () => {
        const scopeFilter = this.buildScopeFilter(scope);
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

        return where;
      },
      {
        page: filter.page,
        limit: filter.limit,
        orderBy: { createdAt: 'desc' },
        include: { ranting: true },
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

  async update(id: string, dto: UpdateMemberDto, scope?: UserScope) {
    return this.baseUpdate(id, dto, scope, 'Data anggota berhasil diperbarui');
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

        // Support legacy import: accept existing member number from CSV.
        // Format lama bisa "001-1994" (urut-tahun) atau "0103-001-1994" (full lama).
        // Selalu dikonversi ke format resmi:
        //   [kodeDistrik]-[kodeWilayah][kodeRanting]-[urut]-[tahun]  (mis. LRT-0103-001-1994)
        const existingNumber = row.nomor_anggota || row.nomorAnggota || row.no_anggota;
        let nomorAnggota: string;
        if (existingNumber) {
          const rantingRow = rantingId
            ? await this.prisma.ranting.findUnique({
                where: { id: rantingId },
                select: {
                  kodeRanting: true,
                  wilayah: {
                    select: { kodeWilayah: true, distrik: { select: { kodeDistrik: true } } },
                  },
                },
              })
            : null;
          const kodeDistrik = rantingRow?.wilayah?.distrik?.kodeDistrik?.split('-').pop()?.trim() || '';
          const kodeWilayah = (rantingRow?.wilayah?.kodeWilayah?.split('-').pop() || '').padStart(2, '0');
          const kodeRanting = (rantingRow?.kodeRanting?.split('-').pop() || '').padStart(2, '0');
          // Segmen terakhir = tahun, segmen ke-2 terakhir = urut (robust utk semua format).
          const legacyParts = String(existingNumber).trim().split('-');
          const urut = legacyParts[legacyParts.length - 2] || '';
          const tahun = legacyParts[legacyParts.length - 1] || '';
          nomorAnggota =
            kodeDistrik && kodeWilayah && kodeRanting && urut && tahun
              ? `${kodeDistrik}-${kodeWilayah}${kodeRanting}-${urut}-${tahun}`
              : String(existingNumber).trim();
        } else {
          nomorAnggota = await this.nraService.generateMemberNumber(
            rantingId || '',
            row.tahun_dadar || row.tahunDadar || undefined,
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const member = await (this.prisma as any).anggota.create({
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

        if (missingFields.length > 0) {
          if (member.email) {
            this.memberMailService.sendToMember(
              member.id,
              (nama: string) => ({
                subject: 'Data Anggota Belum Lengkap — THS-THM',
                html: `<h2>Halo ${escapeHtml(nama)},</h2><p>Data keanggotaan Anda masih belum lengkap. Harap lengkapi data berikut:</p><ul>${missingFields.map((f: string) => `<li>${escapeHtml(f.replace(/_/g, ' '))}</li>`).join('')}</ul><p>Silakan login ke sistem untuk melengkapi data.</p>`,
                text: `Halo ${nama},\n\nData keanggotaan Anda masih belum lengkap. Harap lengkapi data berikut: ${missingFields.join(', ')}\n\nSilakan login ke sistem untuk melengkapi data.`,
              }),
              { template: 'dataIncompleteEmail', email: member.email },
              'members',
            );
          }
          return { success: true, skip: true };
        }

        if (member.email) {
          this.memberMailService.sendToMember(
            member.id,
            (nama: string) => welcomeMemberEmail(nama),
            { template: 'welcomeMemberEmail', email: member.email },
            'members',
          );
        }

        return { success: true };
      },
    });

    this.invalidateCache();
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

  async findByEmail(email: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const member = await (this.prisma as any).anggota.findFirst({
      where: { email, deletedAt: null },
      include: {
        ranting: { include: { wilayah: { include: { distrik: true } } } },
      },
    });

    if (!member) {
      throw new NotFoundException('Anggota tidak ditemukan untuk email ini');
    }

    return member;
  }

  // ── Domain: getDocuments ─────────────────────────────────

  async getDocuments(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documents = await (this.prisma as any).dokumen.findMany({
      where: { anggotaId: id },
      orderBy: { createdAt: 'desc' },
    });

    return documents;
  }

  // ── Domain: getDues ──────────────────────────────────────

  async getDues(id: string) {
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
        { namaLengkap: { contains: q } },
        { nomorAnggota: { contains: q } },
        { email: { contains: q } },
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
        ranting: {
          select: { id: true, nama: true, wilayah: { select: { id: true, nama: true } } },
        },
      },
      take: 20,
      orderBy: { namaLengkap: 'asc' },
    });

    return members;
  }

  // ── Private helpers ──────────────────────────────────────

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

/**
 * Safely parse a date string — returns undefined for invalid dates.
 */
function parseDateSafe(value: string): Date | undefined {
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}
