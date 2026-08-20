import {
  Injectable,
  Inject,
  forwardRef,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import { paymentConfirmationEmail } from '../../mail/email-templates';
import {
  CreateDueDto,
  UpdateDueDto,
  DueFilterDto,
  BatchPaymentDto,
  PaymentConfirmationDto,
} from './dto/dues.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { SelfScopeUser, assertSelfMember } from '../../common/utils/self-scope.helper';
import { MemberMailService } from '../../common/services/member-mail.service';
import { GamificationService } from '../gamification/gamification.service';

@Injectable()
export class DuesService extends BaseCrudService<CreateDueDto, UpdateDueDto> {
  private readonly CACHE_TTL = 30_000; // ms

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scopeHelper: ScopeHelper,
    protected readonly cache: CacheService,
    private readonly memberMailService: MemberMailService,
    @Inject(forwardRef(() => GamificationService))
    private readonly gamificationService: GamificationService,
    @Optional() protected readonly persistentAudit?: PersistentAuditService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'iuran',
      prefix: 'dues:',
      scopeStrategy: 'anggota_indirect',
    }, persistentAudit);
  }

  // ── Hooks ───────────────────────────────────────────────

  protected async beforeCreate(
    dto: CreateDueDto,
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = { ...dto };
    if (dto.tanggalBayar) {
      data.tanggalBayar = new Date(dto.tanggalBayar);
    }
    return data;
  }

  protected async afterCreate(
    result: any,
    dto: CreateDueDto,
  ): Promise<void> {
    // Award gamification points for paid dues
    if (dto.status === 'lunas' && dto.anggotaId) {
      try {
        await this.gamificationService.recordDuesPayment(dto.anggotaId, true);
      } catch (error) {
        this.logger.warn(
          'Failed to award gamification points for dues:',
          (error as Error).message,
        );
      }
    }

    // Send payment confirmation email
    if (dto.anggotaId) {
      this.sendPaymentEmail(dto.anggotaId, dto.jumlah, dto.periode, dto.status);
    }

    this.cache.invalidatePrefix('reports:');
  }

  protected async beforeUpdate(
    _id: string,
    dto: UpdateDueDto,
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    if (dto.periode !== undefined) data.periode = dto.periode;
    if (dto.jumlah !== undefined) data.jumlah = dto.jumlah;
    if (dto.tanggalBayar !== undefined) data.tanggalBayar = new Date(dto.tanggalBayar);
    if (dto.metodeBayar !== undefined) data.metodeBayar = dto.metodeBayar;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.buktiBayarPath !== undefined) data.buktiBayarPath = dto.buktiBayarPath;
    return data;
  }

  protected async afterUpdate(
    result: any,
    dto: UpdateDueDto,
  ): Promise<void> {
    // Award gamification points if status changed to lunas
    if (dto.status === 'lunas' && result?.anggotaId) {
      try {
        await this.gamificationService.recordDuesPayment(result.anggotaId, true);
        this.sendPaymentEmail(result.anggotaId, dto.jumlah, dto.periode, 'lunas');
      } catch (error) {
        this.logger.warn(
          'Failed to award gamification points for dues update:',
          (error as Error).message,
        );
      }
    }

    this.cache.invalidatePrefix('reports:');
  }

  protected async afterRemove(_id: string): Promise<void> {
    this.cache.invalidatePrefix('reports:');
  }

  // ── CRUD Overrides ──────────────────────────────────────

  async findAll(query: DueFilterDto, scope?: UserScope) {
    const cacheKey = `${this.CACHE_PREFIX}list:${scope?.rantingId || 'all'}:${query.page || 1}:${query.limit || 10}:${query.status || ''}:${query.periode || ''}`;

    return this.baseFindAll(
      cacheKey,
      async () => {
        const scopeFilter = this.buildIndirectScopeFilter(scope, 'anggota');
        const where: Record<string, unknown> = { ...scopeFilter };
        if (query.status) where.status = query.status;
        if (query.periode) where.periode = query.periode;
        return where;
      },
      {
        page: query.page,
        limit: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } },
        },
      },
      this.CACHE_TTL / 1000,
    );
  }

  async findOne(id: string, scope?: UserScope, user?: SelfScopeUser) {
    // Anggota/penguji: hanya boleh lihat iuran miliknya sendiri (scope guard
    // level "self" hanya memastikan login, kepemilikan dicek di sini).
    if (user && (user.role === 'anggota' || user.role === 'penguji')) {
      const iuran = await this.prisma.iuran.findUnique({
        where: { id },
        include: {
          anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true, rantingId: true } },
        },
      });
      if (!iuran) throw new NotFoundException('Iuran tidak ditemukan');
      await assertSelfMember(this.prisma as any, user, iuran.anggotaId);
      return iuran;
    }
    return this.baseFindOne(id, scope, {
      anggota: {
        select: { id: true, nomorAnggota: true, namaLengkap: true, rantingId: true },
      },
    });
  }

  async create(dto: CreateDueDto) {
    return this.baseCreate(dto, undefined, undefined, 'Pembayaran iuran berhasil dicatat');
  }

  async update(id: string, dto: UpdateDueDto, scope?: UserScope) {
    return this.baseUpdate(id, dto, scope, 'Data iuran berhasil diperbarui');
  }

  async remove(id: string, scope?: UserScope) {
    return this.baseRemove(id, scope, 'Data iuran berhasil dihapus');
  }

  // ── Domain Methods ──────────────────────────────────────

  async getMemberDues(memberId: string) {
    const dues = await (this.prisma as any).iuran.findMany({
      where: { anggotaId: memberId },
      orderBy: { periode: 'desc' },
    });
    return dues;
  }

  async getMyDues(user: { id: string; email: string; role: string; namaLengkap?: string }) {
    let anggota = await (this.prisma as any).anggota.findFirst({
      where: { email: user.email, deletedAt: null },
      select: { id: true },
    });

    // Fallback: anggota di-import tanpa email — cocokkan via nama (unik & email kosong)
    if (!anggota && user.namaLengkap?.trim()) {
      const byName = await (this.prisma as any).anggota.findMany({
        where: {
          namaLengkap: { equals: user.namaLengkap.trim(), mode: 'insensitive' },
          OR: [{ email: null }, { email: '' }],
          deletedAt: null,
        },
        select: { id: true },
      });
      if (byName.length === 1) anggota = byName[0];
    }

    if (!anggota) {
      return [];
    }

    const dues = await (this.prisma as any).iuran.findMany({
      where: { anggotaId: anggota.id },
      orderBy: { periode: 'desc' },
    });

    return dues;
  }

  async getArrears() {
    const arrears = await (this.prisma as any).iuran.findMany({
      where: { status: 'menunggak' },
      include: {
        anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true, noHp: true } },
      },
      orderBy: { periode: 'asc' },
      take: 10_000,
    });

    const totalArrears = arrears.reduce((sum: number, i: any) => sum + Number(i.jumlah), 0);

    return { items: arrears, totalArrears, count: arrears.length };
  }

  async getDashboardStats() {
    const cacheKey = `${this.CACHE_PREFIX}dashboard`;
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const periode = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

        const [totalIuran, totalLunas, totalMenunggak, iuranBulanIni, anggotaAktif] =
          await Promise.all([
            (this.prisma as any).iuran.aggregate({ _sum: { jumlah: true }, _count: true }),
            (this.prisma as any).iuran.aggregate({
              _sum: { jumlah: true },
              where: { status: 'lunas' },
            }),
            (this.prisma as any).iuran.aggregate({
              _sum: { jumlah: true },
              where: { status: 'menunggak' },
            }),
            (this.prisma as any).iuran.findMany({
              where: { periode },
              select: { jumlah: true, status: true },
            }),
            (this.prisma as any).anggota.count({ where: { statusKeanggotaan: 'aktif' } }),
          ]);

        const iuranBulanIniTotal = iuranBulanIni.reduce(
          (sum: number, i: any) => sum + Number(i.jumlah),
          0,
        );
        const lunasBulanIni = iuranBulanIni.filter((i: any) => i.status === 'lunas').length;
        const belumBayarBulanIni = anggotaAktif - iuranBulanIni.length;

        return {
          totalIuran: Number(totalIuran._sum.jumlah || 0),
          totalTransaksi: totalIuran._count,
          totalLunas: Number(totalLunas._sum.jumlah || 0),
          totalMenunggak: Number(totalMenunggak._sum.jumlah || 0),
          iuranBulanIni: iuranBulanIniTotal,
          lunasBulanIni,
          belumBayarBulanIni,
          anggotaAktif,
        };
      },
      this.CACHE_TTL, // ms — direct cache.getOrSet call
    );
  }

  async getReport() {
    const stats = await (this.prisma as any).iuran.groupBy({
      by: ['status'],
      _count: true,
      _sum: { jumlah: true },
    });

    return stats;
  }

  async exportReport() {
    const dues = await (this.prisma as any).iuran.findMany({
      include: { anggota: { select: { nomorAnggota: true, namaLengkap: true } } },
      take: 10_000,
    });
    return dues;
  }

  async importDues(data: Record<string, unknown>[]) {
    let success = 0;
    for (const row of data) {
      try {
        await (this.prisma as any).iuran.create({
          data: {
            anggotaId: row.anggota_id as string,
            periode: row.periode as string,
            jumlah: parseFloat(row.jumlah as string),
            tanggalBayar: row.tanggal_bayar ? new Date(row.tanggal_bayar as string) : null,
            metodeBayar: (row.metode_bayar as 'manual' | 'transfer' | 'online') || 'manual',
            status:
              (row.status as 'belum_dibayar' | 'menunggu_verifikasi' | 'lunas' | 'menunggak') ||
              'lunas',
          },
        });
        success++;
      } catch {
        /* skip errors */
      }
    }
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    this.cache.invalidatePrefix('reports:');
    this.audit('DUE_IMPORT', 'Iuran', 'bulk', undefined, { success, failed: data.length - success });
    return { imported: success, failed: data.length - success };
  }

  async batchPayment(dto: BatchPaymentDto) {
    const { memberIds, periode, jumlah } = dto;
    for (const memberId of memberIds) {
      await (this.prisma as any).iuran.create({
        data: {
          anggotaId: memberId,
          periode,
          jumlah,
          status: 'lunas',
          tanggalBayar: new Date(),
          metodeBayar: 'manual',
        },
      });
    }
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    this.cache.invalidatePrefix('reports:');
  }

  async submitPaymentConfirmation(id: string, dto: PaymentConfirmationDto) {
    const iuran = await this.prismaDelegate.findUnique({
      where: { id },
      include: { anggota: { select: { id: true, rantingId: true } } },
    });

    if (!iuran) {
      throw new NotFoundException('Iuran tidak ditemukan');
    }

    if (iuran.status === 'lunas') {
      throw new ForbiddenException('Iuran ini sudah lunas');
    }

    const updated = await this.prismaDelegate.update({
      where: { id },
      data: {
        status: 'menunggu_verifikasi',
        metodeBayar: 'transfer',
        buktiBayarPath: dto.catatan || null,
      },
    });

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    this.cache.invalidatePrefix('reports:');

    return updated;
  }

  // ── Private Helpers ─────────────────────────────────────

  private sendPaymentEmail(
    anggotaId: string,
    jumlah?: number,
    periode?: string,
    status?: string,
  ): void {
    this.memberMailService.sendToMemberWithArgs(
      anggotaId,
      paymentConfirmationEmail,
      [jumlah, periode, status === 'lunas'],
      { template: 'paymentConfirmationEmail' },
      'dues',
      {
        jumlah: String(jumlah || 0),
        periode: periode || '',
      },
    );
  }
}
