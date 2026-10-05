import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import { MailService } from '../../mail/mail.service';
import { env } from '../../config/env.validation';
import { userWelcomeEmail } from '../../mail/email-templates';
import { CreateUserDto, UpdateUserDto, UserFilterDto } from './dto/user.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ROLE_ORG_LEVEL, Role, OrgLevel } from '../../common/constants/roles.constant';
import bcrypt from 'bcryptjs';

/** Role yang boleh ditetapkan oleh admin per-level (superadmin bebas). */
const ASSIGNABLE_BY_LEVEL: Record<string, string[]> = {
  district: [
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'penguji',
    'anggota',
  ],
  region: ['admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota'],
  branch: ['admin_ranting', 'admin_kegiatan', 'penguji', 'anggota'],
};

@Injectable()
export class UsersService extends BaseCrudService<CreateUserDto, UpdateUserDto> {
  constructor(
    prisma: PrismaService,
    scopeHelper: ScopeHelper,
    cache: CacheService,
    private readonly mailService: MailService,
    @Optional() protected readonly persistentAudit?: PersistentAuditService,
  ) {
    super(
      prisma,
      scopeHelper,
      cache,
      {
        model: 'user',
        prefix: 'users:',
        notFound: 'User tidak ditemukan',
        scopeStrategy: 'ranting',
      },
      persistentAudit,
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  TENANT GUARDS
  // ═══════════════════════════════════════════════════════════

  /** Level scope dominan (lintas ranting = wilayah/distrik). */
  private static scopeLevel(scope: UserScope): 'district' | 'region' | 'branch' {
    if (scope.distrikId) return 'district';
    if (scope.wilayahId) return 'region';
    return 'branch';
  }

  /**
   * ScopeGuard mengirim `{}` (objek kosong) untuk superadmin, tetapi objek
   * kosong juga bisa terjadi pada admin ter-scope yang belum punya
   * `rantingId`. Karena itu superadmin TIDAK boleh dideteksi dari scope kosong.
   * Service ini mendeteksinya dari role aktor (req.user.role), lalu
   * menormalisasi scope superadmin menjadi `undefined` agar aturan
   * "superadmin bebas" vs "admin ter-scope dibatasi hierarki" tetap akurat.
   */
  private normalizeScope(scope: UserScope | undefined, actorRole?: string): UserScope | undefined {
    return actorRole === 'superadmin' ? undefined : scope;
  }

  /**
   * Non-superadmin hanya boleh menetapkan role pada/di bawah levelnya sendiri.
   * Superadmin (scope kosong) bebas menetapkan role apa pun.
   */
  private resolveAssignableRole(role: string | undefined, scope?: UserScope): string | undefined {
    if (role === undefined) return undefined;
    if (!scope) return role; // superadmin — scope kosong (sudah dinormalisasi)
    const assignable = ASSIGNABLE_BY_LEVEL[UsersService.scopeLevel(scope)];
    if (!assignable || !assignable.includes(role)) {
      throw new ForbiddenException('Anda tidak dapat menetapkan role tersebut');
    }
    return role;
  }

  /**
   * Validasi & normalisasi scope organisasi sesuai role target.
   *
   * Aturan (hierarki Distrik → Wilayah → Ranting):
   * - superadmin/anggota → tanpa scope (semua id dibersihkan).
   * - admin_distrik      → wajib distrikId.
   * - admin_wilayah      → wajib wilayahId (distrikId diturunkan, diabaikan dari input).
   * - admin_ranting/...  → wajib rantingId (wilayah & distrik diturunkan).
   *
   * Id di bawah level yang dibutuhkan diabaikan; id di atas level role dibersihkan
   * agar admin tidak "naik level" diam-diam. Konsistensi ranting→wilayah→distrik
   * selalu diverifikasi ke database.
   */
  private async resolveOrgScope(
    role: string | undefined,
    dto: { distrikId?: string | null; wilayahId?: string | null; rantingId?: string | null },
    scope?: UserScope,
  ): Promise<{ distrikId: string | null; wilayahId: string | null; rantingId: string | null }> {
    const effectiveRole = role ?? 'anggota';
    const level = ROLE_ORG_LEVEL[effectiveRole as Role];

    // Role tanpa scope organisasi: bersihkan semuanya.
    if (!level) {
      return { distrikId: null, wilayahId: null, rantingId: null };
    }

    let distrikId = dto.distrikId?.trim() || null;
    let wilayahId = dto.wilayahId?.trim() || null;
    let rantingId = dto.rantingId?.trim() || null;

    // Role tanpa scope organisasi (anggota, dll): jika client tidak memberi org
    // apa pun, turunkan dari scope aktor (perilaku lama: "auto-assign dari scope").
    if (!level && !distrikId && !wilayahId && !rantingId && scope) {
      distrikId = scope.distrikId ?? null;
      wilayahId = scope.wilayahId ?? null;
      rantingId = scope.rantingId ?? null;
    }

    // Verifikasi ranting & turunkan wilayah/distriknya.
    if (rantingId) {
      const ranting = await this.prisma.ranting.findUnique({
        where: { id: rantingId },
        select: { id: true, wilayahId: true, wilayah: { select: { distrikId: true } } },
      });
      if (!ranting) throw new BadRequestException('Ranting tidak ditemukan');
      wilayahId = ranting.wilayahId;
      distrikId = ranting.wilayah?.distrikId ?? distrikId;
    } else if (wilayahId) {
      const wilayah = await this.prisma.wilayah.findUnique({
        where: { id: wilayahId },
        select: { id: true, distrikId: true },
      });
      if (!wilayah) throw new BadRequestException('Wilayah tidak ditemukan');
      distrikId = wilayah.distrikId;
    } else if (distrikId) {
      const distrik = await this.prisma.distrik.findUnique({
        where: { id: distrikId },
        select: { id: true },
      });
      if (!distrik) throw new BadRequestException('Distrik tidak ditemukan');
    }

    // Id wajib sesuai level role.
    const requiredId =
      level === 'distrik' ? distrikId : level === 'wilayah' ? wilayahId : rantingId;
    if (!requiredId) {
      const label =
        level === 'distrik' ? 'Distrik' : level === 'wilayah' ? 'Wilayah' : 'Ranting';
      throw new BadRequestException(`${label} wajib dipilih untuk role ${effectiveRole}`);
    }

    // Cegah "naik level": bersihkan id di bawah level yang dibutuhkan.
    if (level === 'distrik') {
      wilayahId = null;
      rantingId = null;
    } else if (level === 'wilayah') {
      rantingId = null;
    }

    // Batasi aktor: id yang dipilih harus dalam cakupan aktor (non-superadmin).
    await this.assertWithinActorScope(level, distrikId, wilayahId, rantingId, scope);

    return { distrikId, wilayahId, rantingId };
  }

  /**
   * Batasi aktor non-superadmin: id yang dipilih harus dalam cakupan aktor.
   */
  private async assertWithinActorScope(
    level: OrgLevel,
    distrikId: string | null,
    wilayahId: string | null,
    rantingId: string | null,
    scope?: UserScope,
  ): Promise<void> {
    if (!scope) return; // superadmin — bebas
    const id = level === 'distrik' ? distrikId : level === 'wilayah' ? wilayahId : rantingId;
    if (!id) return;

    let ok: boolean;
    if (level === 'distrik') {
      ok = scope.distrikId === undefined || scope.distrikId === id;
    } else if (level === 'wilayah') {
      ok = await this.wilayahInScope(id, scope);
    } else {
      ok = await this.rantingInScope(id, scope);
    }

    if (!ok) {
      throw new ForbiddenException('Anda hanya dapat mengelola pengguna dalam cakupan Anda');
    }
  }

  private async wilayahInScope(wilayahId: string, scope: UserScope): Promise<boolean> {
    if (!scope.rantingId && !scope.wilayahId && !scope.distrikId) return true;
    if (scope.wilayahId) return scope.wilayahId === wilayahId;
    const wilayah = await this.prisma.wilayah.findUnique({
      where: { id: wilayahId },
      select: { distrikId: true },
    });
    if (!wilayah) return false;
    if (scope.distrikId) return scope.distrikId === wilayah.distrikId;
    // Branch-level actor: wilayah must contain the actor's ranting.
    if (!scope.rantingId) return false;
    const ranting = await this.prisma.ranting.findUnique({
      where: { id: scope.rantingId },
      select: { wilayahId: true },
    });
    return ranting?.wilayahId === wilayahId;
  }

  private async rantingInScope(rantingId: string, scope: UserScope): Promise<boolean> {
    if (!scope.rantingId && !scope.wilayahId && !scope.distrikId) return true;
    if (scope.rantingId) return scope.rantingId === rantingId;
    const ranting = await this.prisma.ranting.findUnique({
      where: { id: rantingId },
      select: { wilayahId: true, wilayah: { select: { distrikId: true } } },
    });
    if (!ranting) return false;
    if (scope.wilayahId) return scope.wilayahId === ranting.wilayahId;
    return scope.distrikId === ranting.wilayah?.distrikId;
  }

  // ═══════════════════════════════════════════════════════════
  //  HOOKS
  // ═══════════════════════════════════════════════════════════

  /**
   * Before create: hash password, auto-assign rantingId from scope,
   * enforce tenant rules on role + rantingId.
   */
  protected async beforeCreate(
    dto: CreateUserDto,
    scope?: UserScope,
    _userId?: string,
  ): Promise<Record<string, unknown>> {
    const role = this.resolveAssignableRole(dto.role, scope);
    const org = await this.resolveOrgScope(role, dto, scope);
    const passwordHash = await bcrypt.hash(dto.password || 'password123', 12);

    return {
      email: dto.email,
      namaLengkap: dto.namaLengkap,
      role,
      ...org,
      passwordHash,
    };
  }

  /**
   * After create: send welcome email with password setup link.
   * Fails silently — just logs a warning.
   */
  protected async afterCreate(result: any, _dto: CreateUserDto): Promise<void> {
    const setPasswordUrl = `${env.frontendUrl}/forgot-password?email=${encodeURIComponent(result.email)}`;
    this.sendWelcomeEmail(result.email, result.namaLengkap, result.role, setPasswordUrl);
  }

  /**
   * Before update: sparse field mapping with bcrypt for password changes.
   * Only includes fields that are explicitly provided.
   *
   * Jika role atau id organisasi berubah, scope organisasi dihitung ulang lewat
   * `resolveOrgScope` agar aturan per-level (admin_distrik → distrik saja, dst)
   * tetap konsisten dengan saat create.
   */
  protected async beforeUpdate(
    id: string,
    dto: UpdateUserDto,
    scope?: UserScope,
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.namaLengkap !== undefined) data.namaLengkap = dto.namaLengkap;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);

    // Recompute org scope bila ada perubahan role atau id organisasi.
    if (
      dto.role !== undefined ||
      dto.distrikId !== undefined ||
      dto.wilayahId !== undefined ||
      dto.rantingId !== undefined
    ) {
      // Role final = role baru, atau role user yang sedang diupdate.
      const existing = await this.prisma.user.findUnique({
        where: { id },
        select: { role: true, distrikId: true, wilayahId: true, rantingId: true },
      });
      const role = dto.role ?? existing?.role;
      // Gabungkan nilai lama + perubahan: tanpa ini, update yang hanya mengirim
      // `role` (mis. promote ke admin_distrik) akan kehilangan id organisasi
      // yang sudah ada di record dan ditolak sebagai "wajib dipilih".
      const merged = {
        distrikId: dto.distrikId !== undefined ? dto.distrikId : existing?.distrikId,
        wilayahId: dto.wilayahId !== undefined ? dto.wilayahId : existing?.wilayahId,
        rantingId: dto.rantingId !== undefined ? dto.rantingId : existing?.rantingId,
      };
      const org = await this.resolveOrgScope(role, merged, scope);
      Object.assign(data, org);
    }

    return data;
  }

  // ═══════════════════════════════════════════════════════════
  //  STANDARD CRUD
  // ═══════════════════════════════════════════════════════════

  async findAll(query: UserFilterDto, scope?: UserScope) {
    return this.baseFindAll(
      `users:list:${scope?.rantingId || scope?.wilayahId || scope?.distrikId || 'all'}:${query.page || 1}:${query.limit || 10}`,
      async () => {
        const where: Record<string, unknown> = {};

        // Search & role filters
        if (query.role) where.role = query.role;
        if (query.search) where.namaLengkap = { contains: query.search, mode: 'insensitive' };

        // Scope filtering — User has a direct `rantingId` field AND
        // a `ranting` relation for wilayah/distrik level filtering.
        Object.assign(where, this.buildScopeFilter(scope));

        return where;
      },
      {
        page: query.page,
        limit: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          namaLengkap: true,
          role: true,
          distrikId: true,
          wilayahId: true,
          rantingId: true,
          isActive: true,
          createdAt: true,
        },
      },
    );
  }

  async findOne(id: string, scope?: UserScope) {
    // baseFindOne handles scope verification + NotFoundException
    // select excludes passwordHash from response
    return this.baseFindOne(id, scope, undefined, {
      id: true,
      email: true,
      namaLengkap: true,
      role: true,
      distrikId: true,
      wilayahId: true,
      rantingId: true,
      isActive: true,
      createdAt: true,
      // Relasi dipakai form Edit untuk prefill cascade distrik → wilayah → ranting.
      // (`/org-structure/ranting/:id` superadmin-only, jadi tidak bisa dipakai
      // admin ter-scope untuk resolve ranting target.)
      ranting: {
        select: {
          id: true,
          nama: true,
          wilayahId: true,
          wilayah: {
            select: {
              id: true,
              nama: true,
              distrikId: true,
              distrik: { select: { id: true, nama: true } },
            },
          },
        },
      },
    });
  }

  async create(dto: CreateUserDto, scope?: UserScope, userId?: string, actorRole?: string) {
    return this.baseCreate(
      dto,
      this.normalizeScope(scope, actorRole),
      userId,
      'User berhasil dibuat',
    );
  }

  async update(id: string, dto: UpdateUserDto, scope?: UserScope, actorRole?: string) {
    // Superadmin tidak boleh dideteksi dari scope kosong — lihat normalizeScope().
    const effectiveScope = this.normalizeScope(scope, actorRole);
    // Tenant guard — baseUpdate tidak meneruskan scope ke beforeUpdate,
    // jadi role & scope organisasi dari client divalidasi di sini.
    this.resolveAssignableRole(dto.role, effectiveScope);

    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true, distrikId: true, wilayahId: true, rantingId: true },
    });
    if (!existing) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Gabungkan nilai lama + perubahan, lalu validasi ulang sesuai role efektif.
    const effectiveRole = dto.role ?? existing.role;
    const merged = {
      distrikId: dto.distrikId !== undefined ? dto.distrikId : existing.distrikId,
      wilayahId: dto.wilayahId !== undefined ? dto.wilayahId : existing.wilayahId,
      rantingId: dto.rantingId !== undefined ? dto.rantingId : existing.rantingId,
    };
    await this.resolveOrgScope(effectiveRole, merged, effectiveScope);

    return this.baseUpdate(id, dto, effectiveScope, 'User berhasil diperbarui');
  }

  /**
   * Soft-delete: set isActive = false (not a real delete).
   * Overrides baseRemove because we use `isActive` instead of `deletedAt`.
   */
  async remove(id: string, scope?: UserScope) {
    await this.verifyScope(id, scope);
    await this.prismaDelegate.update({
      where: { id },
      data: { isActive: false },
    });
    this.invalidateCache();
    // void — interceptor returns { success: true }
  }

  // ═══════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════

  private sendWelcomeEmail(
    email: string,
    nama: string,
    role: string,
    setPasswordUrl: string,
  ): void {
    const { subject, html } = userWelcomeEmail(nama, email, role, setPasswordUrl);
    this.mailService
      .sendMail({
        to: email,
        subject,
        html,
        metadata: { module: 'users', template: 'userWelcomeEmail', email, role },
      })
      .catch(() => {
        this.logger.warn(`Failed to send welcome email to user ${email}`);
      });
  }
}
