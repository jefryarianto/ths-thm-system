import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import { MailService } from '../../mail/mail.service';
import { env } from '../../config/env.validation';
import { userWelcomeEmail } from '../../mail/email-templates';
import {
  CreateUserDto,
  UpdateUserDto,
  UserFilterDto,
} from './dto/user.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import bcrypt from 'bcryptjs';

/** Role yang boleh ditetapkan oleh admin per-level (superadmin bebas). */
const ASSIGNABLE_BY_LEVEL: Record<string, string[]> = {
  district: ['admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota'],
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
    super(prisma, scopeHelper, cache, {
      model: 'user',
      prefix: 'users:',
      notFound: 'User tidak ditemukan',
      scopeStrategy: 'ranting',
    }, persistentAudit);
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
   * Non-superadmin hanya boleh menetapkan role pada/di bawah levelnya sendiri.
   * Superadmin (scope kosong) bebas menetapkan role apa pun.
   */
  private resolveAssignableRole(role: string | undefined, scope?: UserScope): string | undefined {
    if (role === undefined) return undefined;
    if (!scope) return role; // superadmin — scope kosong
    const assignable = ASSIGNABLE_BY_LEVEL[UsersService.scopeLevel(scope)];
    if (!assignable || !assignable.includes(role)) {
      throw new ForbiddenException('Anda tidak dapat menetapkan role tersebut');
    }
    return role;
  }

  /**
   * Non-superadmin: rantingId dari client harus berada dalam cakupannya.
   * Superadmin bebas menempatkan user di ranting mana pun.
   */
  private async resolveRantingId(
    rantingId: string | undefined | null,
    scope?: UserScope,
  ): Promise<string | undefined | null> {
    if (!rantingId || !scope) return rantingId;
    const ok = await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, rantingId);
    if (!ok) {
      throw new ForbiddenException('Anda hanya dapat mengelola pengguna dalam cakupan Anda');
    }
    return rantingId;
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
    const rantingId = (await this.resolveRantingId(dto.rantingId, scope)) || scope?.rantingId;
    const defaultPassword = dto.password || 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    return {
      email: dto.email,
      namaLengkap: dto.namaLengkap,
      role,
      rantingId,
      passwordHash,
    };
  }

  /**
   * After create: send welcome email with password setup link.
   * Fails silently — just logs a warning.
   */
  protected async afterCreate(
    result: any,
    _dto: CreateUserDto,
  ): Promise<void> {
    const setPasswordUrl = `${env.frontendUrl}/forgot-password?email=${encodeURIComponent(result.email)}`;
    this.sendWelcomeEmail(result.email, result.namaLengkap, result.role, setPasswordUrl);
  }

  /**
   * Before update: sparse field mapping with bcrypt for password changes.
   * Only includes fields that are explicitly provided.
   */
  protected async beforeUpdate(
    _id: string,
    dto: UpdateUserDto,
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.namaLengkap !== undefined) data.namaLengkap = dto.namaLengkap;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.rantingId !== undefined) data.rantingId = dto.rantingId;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);
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
      rantingId: true,
      isActive: true,
      createdAt: true,
    });
  }

  async create(dto: CreateUserDto, scope?: UserScope, userId?: string) {
    return this.baseCreate(dto, scope, userId, 'User berhasil dibuat');
  }

  async update(id: string, dto: UpdateUserDto, scope?: UserScope) {
    // Tenant guard — baseUpdate tidak meneruskan scope ke beforeUpdate,
    // jadi role/rantingId dari client divalidasi di sini sebelum update.
    this.resolveAssignableRole(dto.role, scope);
    await this.resolveRantingId(dto.rantingId, scope);
    return this.baseUpdate(id, dto, scope, 'User berhasil diperbarui');
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
