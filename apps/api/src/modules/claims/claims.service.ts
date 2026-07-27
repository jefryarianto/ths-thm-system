import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { MailService } from '../../mail/mail.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import { claimStatusEmail } from '../../mail/email-templates';
import { CreateClaimDto, UpdateClaimDto, ClaimFilterDto } from './dto/claim.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';

const CLAIM_INCLUDE = {
  anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true, rantingId: true } },
};

@Injectable()
export class ClaimsService extends BaseCrudService<CreateClaimDto, UpdateClaimDto> {
  constructor(
    prisma: PrismaService,
    scopeHelper: ScopeHelper,
    cache: CacheService,
    private readonly mailService: MailService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'klaim',
      prefix: 'claims:',
      notFound: 'Klaim tidak ditemukan',
      scopeStrategy: 'anggota_indirect',
    });
  }

  // ── Hooks ──────────────────────────────────────────────

  protected async beforeCreate(dto: CreateClaimDto): Promise<Record<string, unknown>> {
    return {
      ...dto,
      status: 'pending',
    };
  }

  protected async beforeUpdate(_id: string, dto: UpdateClaimDto): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    if (dto.catatan !== undefined) data.catatan = dto.catatan;
    return data;
  }

  // ── CRUD overrides ─────────────────────────────────────

  async findAll(query: ClaimFilterDto, scope?: UserScope) {
    return this.baseFindAll(
      `claims:${JSON.stringify(query)}`,
      async () => {
        const where: Record<string, unknown> = {};
        if (query.status) where.status = query.status;
        if (query.tipe) where.tipe = query.tipe;
        Object.assign(where, this.buildIndirectScopeFilter(scope, 'anggota'));
        return where;
      },
      {
        page: query.page,
        limit: query.limit,
        orderBy: { createdAt: 'desc' },
        include: CLAIM_INCLUDE,
      },
    );
  }

  async findOne(id: string, scope?: UserScope) {
    return this.baseFindOne(id, scope, CLAIM_INCLUDE);
  }

  async create(dto: CreateClaimDto) {
    return this.baseCreate(dto, undefined, undefined, 'Klaim berhasil diajukan');
  }

  async update(id: string, dto: UpdateClaimDto, scope?: UserScope) {
    return this.baseUpdate(id, dto, scope, 'Klaim berhasil diperbarui');
  }

  async remove(id: string, scope?: UserScope) {
    return this.baseRemove(id, scope, 'Klaim berhasil dihapus');
  }

  // ── Domain Methods ─────────────────────────────────────

  async approve(id: string, scope?: UserScope) {
    await this.verifyScope(id, scope);
    const claim = await this.prismaDelegate.findUnique({
      where: { id },
      include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true, email: true, rantingId: true } } },
    });
    if (!claim) throw new NotFoundException('Klaim tidak ditemukan');

    await this.prismaDelegate.update({ where: { id }, data: { status: 'disetujui' } });
    this.sendClaimStatusEmail(claim.anggota, 'disetujui');
    this.invalidateCache();
    return { message: 'Klaim disetujui, dokumen dalam antrian generate' };
  }

  async reject(id: string, reason?: string, scope?: UserScope) {
    await this.verifyScope(id, scope);
    const claim = await this.prismaDelegate.findUnique({
      where: { id },
      include: { anggota: { select: { id: true, namaLengkap: true, email: true, rantingId: true } } },
    });
    if (!claim) throw new NotFoundException('Klaim tidak ditemukan');

    const updateData: Record<string, unknown> = { status: 'ditolak' };
    if (reason) updateData.catatan = reason;
    await this.prismaDelegate.update({ where: { id }, data: updateData });
    this.sendClaimStatusEmail(claim.anggota, 'ditolak', reason);
    this.invalidateCache();
    return { message: reason || 'Klaim ditolak' };
  }

  async process(id: string, scope?: UserScope) {
    await this.verifyScope(id, scope);
    const claim = await this.prismaDelegate.findUnique({
      where: { id },
      include: { anggota: { select: { id: true, namaLengkap: true, email: true, rantingId: true } } },
    });
    if (!claim) throw new NotFoundException('Klaim tidak ditemukan');

    const updated = await this.prismaDelegate.update({ where: { id }, data: { status: 'diproses' } });
    this.sendClaimStatusEmail(claim.anggota, 'diproses');
    this.invalidateCache();
    return { data: updated, message: 'Klaim sedang diproses' };
  }

  // ── Email Helper ──────────────────────────────────────

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
