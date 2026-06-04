import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCandidateDto, UpdateCandidateDto, CandidateFilterDto } from './dto/candidate.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
  ) {}

  async findAll(filter: CandidateFilterDto, scope?: UserScope) {
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

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

    const [data, total] = await Promise.all([
      this.prisma.calonAnggota.findMany({
        where,
        skip,
        take: limit,
        include: { ranting: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.calonAnggota.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, scope?: UserScope) {
    const candidate = await this.prisma.calonAnggota.findUnique({
      where: { id },
      include: { ranting: { include: { wilayah: { include: { distrik: true } } } } },
    });

    if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');

    if (scope && !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, candidate.rantingId))) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }

    return { success: true, data: candidate };
  }

  async create(dto: CreateCandidateDto, scope?: UserScope) {
    // Auto-assign rantingId from scope for branch-level users
    if (scope?.rantingId && !dto.rantingId) {
      (dto as any).rantingId = scope.rantingId;
    }
    const candidate = await this.prisma.calonAnggota.create({
      data: {
        ...dto,
        status: 'diusulkan',
      },
    });

    return { success: true, data: candidate, message: 'Calon anggota berhasil ditambahkan' };
  }

  async update(id: string, dto: UpdateCandidateDto) {
    const candidate = await this.prisma.calonAnggota.update({
      where: { id },
      data: dto,
    });

    return { success: true, data: candidate, message: 'Data calon anggota berhasil diperbarui' };
  }

  async remove(id: string) {
    await this.prisma.calonAnggota.delete({ where: { id } });
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

    return { success: true, data: member, message: 'Calon anggota disetujui dan menjadi anggota' };
  }

  async reject(id: string, reason?: string) {
    const candidate = await this.prisma.calonAnggota.findUnique({ where: { id } });

    if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');

    await this.prisma.calonAnggota.update({
      where: { id },
      data: { status: 'dibatalkan' },
    });

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