import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { claimStatusEmail } from '../../mail/email-templates';
import { CreateClaimDto, UpdateClaimDto, ClaimFilterDto } from './dto/claim.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { MemberMailService } from '../../common/services/member-mail.service';
import { paginate } from '../../common/utils/pagination';

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly mailService: MailService,
    private readonly memberMailService: MemberMailService,
  ) {}

  private async verifyClaimAccess(id: string, scope?: UserScope) {
    const claim = await this.prisma.klaim.findUnique({
      where: { id },
      include: {
        anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true, rantingId: true } },
      },
    });
    if (!claim) throw new NotFoundException('Klaim tidak ditemukan');

    if (
      scope &&
      !(await this.scopeHelper.hasAccessToResourceAsync(
        this.prisma,
        scope,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (claim as any).anggota?.rantingId,
      ))
    ) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }

    return claim;
  }

  async findAll(query: ClaimFilterDto, scope?: UserScope) {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.tipe) where.tipe = query.tipe;

    const scopeFilter = this.scopeHelper.buildIndirectScopeFilter(scope || {}, 'anggota');
    Object.assign(where, scopeFilter);

    return paginate(this.prisma.klaim, where, {
      page: query.page,
      limit: query.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true, rantingId: true } },
      },
    });
  }

  async findOne(id: string, scope?: UserScope) {
    const claim = await this.verifyClaimAccess(id, scope);
    return { success: true, data: claim };
  }

  async create(dto: CreateClaimDto) {
    const claim = await this.prisma.klaim.create({
      data: {
        anggotaId: dto.anggotaId,
        tipe: dto.tipe as never,
        catatan: dto.catatan,
        status: 'pending',
      },
    });
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
    const claim = await this.verifyClaimAccess(id, scope);
    await this.prisma.klaim.update({ where: { id }, data: { status: 'disetujui' } });
    this.sendClaimStatusEmail(claim.anggota, 'disetujui');
    return { success: true, message: 'Klaim disetujui, dokumen dalam antrian generate' };
  }

  async reject(id: string, reason?: string, scope?: UserScope) {
    const claim = await this.verifyClaimAccess(id, scope);
    await this.prisma.klaim.update({ where: { id }, data: { status: 'ditolak', catatan: reason } });
    this.sendClaimStatusEmail(claim.anggota, 'ditolak', reason);
    return { success: true, message: reason || 'Klaim ditolak' };
  }

  async process(id: string, scope?: UserScope) {
    const claim = await this.verifyClaimAccess(id, scope);
    const updated = await this.prisma.klaim.update({ where: { id }, data: { status: 'diproses' } });
    this.sendClaimStatusEmail(claim.anggota, 'diproses');
    return { success: true, data: updated, message: 'Klaim sedang diproses' };
  }

  private sendClaimStatusEmail(
    anggota: { namaLengkap?: string; email?: string } | null | undefined,
    status: string,
    reason?: string,
  ): void {
    if (!anggota || !anggota.email) return;
    const email = anggota.email;
    const nama = anggota.namaLengkap || 'Anggota';
    (async () => {
      try {
        const tpl = await this.mailService.renderWithOverride(
          'claimStatusEmail',
          () => claimStatusEmail(nama, status, reason),
          { nama, status, alasan: reason || '' },
        );
        await this.mailService.sendMail({
          to: email,
          subject: tpl.subject,
          html: tpl.html,
          metadata: { module: 'claims', template: 'claimStatusEmail' },
        });
      } catch (err) {
        this.logger.error(`Claim status email failed for ${email}: ${(err as Error).message}`);
      }
    })();
  }
}
