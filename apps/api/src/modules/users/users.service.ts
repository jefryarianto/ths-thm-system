import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { env } from '../../config/env.validation';
import { userWelcomeEmail } from '../../mail/email-templates';
import { CreateUserDto, UpdateUserDto, UserFilterDto } from './dto/user.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { paginate } from '../../common/utils/pagination';
import bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly mailService: MailService,
  ) {}

  async findAll(query: UserFilterDto, scope?: UserScope) {
    const where: Record<string, unknown> = {};
    if (query.role) where.role = query.role;
    if (query.search) where.namaLengkap = { contains: query.search };

    // Scope filtering: user → rantingId
    if (scope?.rantingId) {
      where.rantingId = scope.rantingId;
    } else if (scope?.wilayahId) {
      where.ranting = { wilayahId: scope.wilayahId };
    } else if (scope?.distrikId) {
      where.ranting = { wilayah: { distrikId: scope.distrikId } };
    }

    return paginate(this.prisma.user, where, {
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
    });
  }

  async findOne(id: string, scope?: UserScope) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        namaLengkap: true,
        role: true,
        rantingId: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    // Scope verification
    if (
      scope &&
      !(await this.scopeHelper.hasAccessToResourceAsync(
        this.prisma,
        scope,
        user.rantingId ?? undefined,
      ))
    ) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }

    return { success: true, data: user };
  }

  async create(dto: CreateUserDto, scope?: UserScope) {
    // Auto-assign rantingId from scope if not provided
    const rantingId = dto.rantingId || scope?.rantingId;
    const defaultPassword = dto.password || 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        namaLengkap: dto.namaLengkap,
        role: dto.role as never,
        rantingId,
        passwordHash,
      },
    });
    const { passwordHash: _, ...result } = user;

    const setPasswordUrl = `${env.frontendUrl}/forgot-password?email=${encodeURIComponent(result.email)}`;
    this.sendWelcomeEmail(result.email, result.namaLengkap, result.role, setPasswordUrl);

    return { success: true, data: result, message: 'User berhasil dibuat' };
  }

  private sendWelcomeEmail(email: string, nama: string, role: string, setPasswordUrl: string) {
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

  async update(id: string, dto: UpdateUserDto, scope?: UserScope) {
    if (scope) {
      await this.scopeHelper.verifyResourceAccess(
        this.prisma,
        scope,
        id,
        (prisma, rid) =>
          prisma.user.findUnique({ where: { id: rid }, select: { rantingId: true } }),
        'User tidak ditemukan',
      );
    }

    const data: Record<string, unknown> = {};
    if (dto.email) data.email = dto.email;
    if (dto.namaLengkap) data.namaLengkap = dto.namaLengkap;
    if (dto.role) data.role = dto.role;
    if (dto.rantingId !== undefined) data.rantingId = dto.rantingId;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, namaLengkap: true, role: true, isActive: true },
    });
    return { success: true, data: user, message: 'User berhasil diperbarui' };
  }

  async remove(id: string, scope?: UserScope) {
    if (scope) {
      await this.scopeHelper.verifyResourceAccess(
        this.prisma,
        scope,
        id,
        (prisma, rid) =>
          prisma.user.findUnique({ where: { id: rid }, select: { rantingId: true } }),
        'User tidak ditemukan',
      );
    }

    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    return { success: true, message: 'User dinonaktifkan' };
  }
}
