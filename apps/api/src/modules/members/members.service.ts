import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMemberDto, UpdateMemberDto, MemberFilterDto } from './dto/member.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
  ) {}

  async findAll(filter: MemberFilterDto, scope?: UserScope) {
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const scopeFilter = this.scopeHelper.buildScopeFilter(scope || {});

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

    const [data, total] = await Promise.all([
      this.prisma.anggota.findMany({
        where,
        skip,
        take: limit,
        include: { ranting: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.anggota.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
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
    if (scope && !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, member.rantingId))) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }

    return { success: true, data: member };
  }

  async create(dto: CreateMemberDto, scope?: UserScope) {
    // Auto-assign rantingId from scope for branch-level users
    if (scope?.rantingId && !dto.rantingId) {
      (dto as any).rantingId = scope.rantingId;
    }
    const member = await this.prisma.anggota.create({
      data: {
        ...dto,
        nomorAnggota: await this.generateMemberNumber(),
        statusData: 'complete',
        statusValidasi: 'pending',
      } as any,
    });

    return { success: true, data: member, message: 'Anggota berhasil ditambahkan' };
  }

  async update(id: string, dto: UpdateMemberDto) {
    const member = await this.prisma.anggota.update({
      where: { id },
      data: dto,
    });

    return { success: true, data: member, message: 'Data anggota berhasil diperbarui' };
  }

  async remove(id: string) {
    await this.prisma.anggota.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true, message: 'Anggota berhasil dihapus' };
  }

  async importCsv(data: any[], scope?: UserScope) {
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
            missingFields: missingFields.length > 0 ? (missingFields as any) : undefined,
          } as any,
        });

        if (missingFields.length > 0) {
          results.incomplete++;
          results.details.push({ row, missingFields, memberId: member.id });
        } else {
          results.success++;
        }
      } catch (error) {
        results.errors++;
        results.details.push({ row, error: (error as Error).message });
      }
    }

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

  private validateCsvRow(row: any): string[] {
    const required = ['nama', 'name'];
    const missing: string[] = [];

    const hasName = required.some((field) => row[field]);
    if (!hasName) missing.push('nama');

    if (!row.jenis_kelamin && !row.gender) missing.push('jenis_kelamin');

    return missing;
  }
}