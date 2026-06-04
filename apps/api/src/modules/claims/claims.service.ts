import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClaimDto, UpdateClaimDto, ClaimFilterDto } from './dto/claim.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';

@Injectable()
export class ClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
  ) {}

  /**
   * Verify scope access for a claim. Returns the claim with anggota data.
   * Throws NotFoundException if not found, ForbiddenException if out of scope.
   */
  private async verifyClaimAccess(id: string, scope?: UserScope) {
    const claim = await this.prisma.klaim.findUnique({
      where: { id },
      include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true, rantingId: true } } },
    });
    if (!claim) throw new NotFoundException('Klaim tidak ditemukan');

    if (scope && !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, (claim as any).anggota?.rantingId))) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }

    return claim;
  }

  async findAll(query: ClaimFilterDto, scope?: UserScope) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.tipe) where.tipe = query.tipe;

    // Scope filtering: klaim → anggota → ranting
    const scopeFilter = this.scopeHelper.buildIndirectScopeFilter(scope || {}, 'anggota');
    Object.assign(where, scopeFilter);

    const [data, total] = await Promise.all([
      this.prisma.klaim.findMany({ where, skip: (page - 1) * limit, take: limit, include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true, rantingId: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.klaim.count({ where }),
    ]);
    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, scope?: UserScope) {
    const claim = await this.verifyClaimAccess(id, scope);
    return { success: true, data: claim };
  }

  async create(dto: CreateClaimDto) {
    const claim = await this.prisma.klaim.create({ data: { anggotaId: dto.anggotaId, tipe: dto.tipe as never, catatan: dto.catatan, status: 'pending' } });
    return { success: true, data: claim, message: 'Klaim berhasil diajukan' };
  }

  async update(id: string, dto: UpdateClaimDto, scope?: UserScope) {
    await this.verifyClaimAccess(id, scope);

    const data: Record<string, unknown> = {};
    if (dto.catatan !== undefined) data.catatan = dto.catatan;
    const claim = await this.prisma.klaim.update({ where: { id }, data });
    return { success: true, data: claim, message: 'Klaim berhasil diperbarui' };
  }

  async remove(id: string, scope?: UserScope) {
    await this.verifyClaimAccess(id, scope);
    await this.prisma.klaim.delete({ where: { id } });
    return { success: true, message: 'Klaim berhasil dihapus' };
  }

  async approve(id: string, scope?: UserScope) {
    await this.verifyClaimAccess(id, scope);
    await this.prisma.klaim.update({ where: { id }, data: { status: 'disetujui' } });
    return { success: true, message: 'Klaim disetujui, dokumen dalam antrian generate' };
  }

  async reject(id: string, reason?: string, scope?: UserScope) {
    await this.verifyClaimAccess(id, scope);
    await this.prisma.klaim.update({ where: { id }, data: { status: 'ditolak', catatan: reason } });
    return { success: true, message: reason || 'Klaim ditolak' };
  }

  async process(id: string, scope?: UserScope) {
    await this.verifyClaimAccess(id, scope);
    const claim = await this.prisma.klaim.update({ where: { id }, data: { status: 'diproses' } });
    return { success: true, data: claim, message: 'Klaim sedang diproses' };
  }
}
