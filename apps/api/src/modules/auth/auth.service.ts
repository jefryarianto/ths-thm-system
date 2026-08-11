import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { Response } from 'express'; // Tambahkan import ini
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { resetPasswordEmail, escapeHtml } from '../../mail/email-templates';
import { env } from '../../config/env.validation';
import {
  LoginDto,
  RegisterDto,
  RefreshDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from './dto/auth.dto';
import { ApprovalService } from '../approvals/approval.service';

interface UserPayload {
  id: string;
  email: string;
  role: string;
}

interface OAuthUserProfile {
  provider: 'google';
  providerId: string;
  email?: string;
  name: string;
  photo?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    @Inject('ENV') private readonly envConfig: typeof env,
    @Optional() private readonly approvalService?: ApprovalService,
  ) {}

  async login(dto: LoginDto, response?: Response) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email atau password salah');
    }
    const tokens = await this.generateTokens(user);
    if (response) {
      this.setRefreshTokenCookie(response, tokens.refreshToken);
      return { user: await this.sanitizeUser(user), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    }
    return { user: await this.sanitizeUser(user), ...tokens };
  }

  async register(dto: RegisterDto, response?: Response) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email sudah terdaftar');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    // Security: force role to 'anggota' for public registration — never trust user-supplied role
    const role: Role = 'anggota';
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        namaLengkap: dto.namaLengkap,
        role,
        rantingId: dto.rantingId,
      },
    });
    const tokens = await this.generateTokens(user);
    if (response) {
      this.setRefreshTokenCookie(response, tokens.refreshToken);
      return { user: await this.sanitizeUser(user), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    }
    return { user: await this.sanitizeUser(user), ...tokens };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.envConfig.jwtRefreshSecret,
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.refreshToken !== refreshToken)
        throw new UnauthorizedException('Token tidak valid');
      const tokens = await this.generateTokens(user);
      return tokens;
    } catch {
      throw new UnauthorizedException('Token tidak valid atau kadaluarsa');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Update User model (only fields that exist on the User schema)
    const userData: Record<string, unknown> = {};
    if (dto.namaLengkap) userData.namaLengkap = dto.namaLengkap;
    if (dto.email) userData.email = dto.email;

    const user = await this.prisma.user.update({ where: { id: userId }, data: userData });

    // Update Anggota model (profile fields like noHp, alamat, tempatLahir, tanggalLahir)
    // Only triggers when profile-specific fields are provided
    const hasAnggotaFields =
      dto.noHp !== undefined ||
      dto.alamat !== undefined ||
      dto.tempatLahir !== undefined ||
      dto.tanggalLahir !== undefined;
    // hasUserFields not needed here — handled by hasAnggotaFields logic

    if (hasAnggotaFields) {
      const anggotaData: Record<string, unknown> = {};
      if (dto.namaLengkap) anggotaData.namaLengkap = dto.namaLengkap;
      if (dto.noHp !== undefined) anggotaData.noHp = dto.noHp;
      if (dto.alamat !== undefined) anggotaData.alamat = dto.alamat;
      if (dto.tempatLahir) anggotaData.tempatLahir = dto.tempatLahir;
      if (dto.tanggalLahir) anggotaData.tanggalLahir = new Date(dto.tanggalLahir);
      if (dto.email !== undefined) anggotaData.email = dto.email;

      // Cocokkan via email; fallback via nama lengkap untuk anggota yang email-nya
      // kosong (hasil import CSV) dan unik — supaya profil tetap tersinkron.
      let anggota = await this.prisma.anggota.findFirst({
        where: { email: user.email },
      });
      if (!anggota && user.namaLengkap?.trim()) {
        const byName = await this.prisma.anggota.findMany({
          where: {
            namaLengkap: { equals: user.namaLengkap.trim(), mode: 'insensitive' },
            OR: [{ email: null }, { email: '' }],
          },
        });
        if (byName.length === 1) anggota = byName[0];
      }

      if (anggota) {
        await this.prisma.anggota.update({
          where: { id: anggota.id },
          data: anggotaData,
        });

        // Recalculate missing fields and trigger approval workflow
        await this.triggerProfileApproval(anggota.id, userId);
      } else {
        console.warn(
          `updateProfile: No Anggota record found for user ${userId} (email: ${user.email}) — profile fields not synced`,
        );
      }
    }

    return this.sanitizeUser(user);
  }

  /**
   * After a member updates their own profile, recalculate completeness
   * and trigger the multi-level approval workflow (ranting → wilayah → distrik).
   */
  private async triggerProfileApproval(anggotaId: string, userId: string): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const member = await (this.prisma as any).anggota.findUnique({
        where: { id: anggotaId },
        select: {
          namaLengkap: true,
          jenisKelamin: true,
          tempatLahir: true,
          tanggalLahir: true,
          tempatDadar: true,
          tahunDadar: true,
          alamat: true,
          noHp: true,
          email: true,
          tingkat: true,
        },
      });

      if (!member) return;

      // Calculate missing fields
      const missingFields: string[] = [];
      if (!member.namaLengkap) missingFields.push('nama_lengkap');
      if (!member.jenisKelamin) missingFields.push('jenis_kelamin');
      if (!member.tempatLahir) missingFields.push('tempat_lahir');
      if (!member.tanggalLahir) missingFields.push('tanggal_lahir');
      if (!member.tempatDadar) missingFields.push('tempat_dadar');
      if (!member.tahunDadar) missingFields.push('tahun_dadar');
      if (!member.alamat) missingFields.push('alamat');
      if (!member.noHp) missingFields.push('no_hp');
      if (!member.email) missingFields.push('email');
      if (!member.tingkat) missingFields.push('tingkat');

      const statusData = missingFields.length > 0 ? 'incomplete' : 'complete';

      // Update statusData and missingFields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.prisma as any).anggota.update({
        where: { id: anggotaId },
        data: {
          statusData,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          missingFields: missingFields.length > 0 ? (missingFields as any) : undefined,
        },
      });

      // If data is now complete, trigger approval workflow
      if (statusData === 'complete') {
        // Set statusValidasi to pending
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.prisma as any).anggota.update({
          where: { id: anggotaId },
          data: { statusValidasi: 'pending' },
        });

        // Submit approval request
        if (this.approvalService) {
          await this.approvalService.submit(
            { requestType: 'member_update', itemId: anggotaId },
            userId,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to trigger profile approval for member ${anggotaId}: ${(error as Error).message}`);
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Password lama salah');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      return;
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id, email: user.email, purpose: 'reset-password' },
      { secret: this.envConfig.jwtRefreshSecret, expiresIn: '1h' },
    );

    const resetUrl = `${env.frontendUrl}/reset-password?token=${resetToken}`;

    const tpl = await this.mailService.renderWithOverride(
      'resetPasswordEmail',
      () => resetPasswordEmail(user.namaLengkap, resetUrl),
      { nama: user.namaLengkap, resetUrl },
    );
    await this.mailService.sendMail({
      to: user.email,
      subject: tpl.subject,
      html: tpl.html,
      metadata: { module: 'auth', template: 'resetPasswordEmail' },
    });

  }

  async resetPassword(dto: ResetPasswordDto) {
    try {
      const payload = this.jwtService.verify(dto.token, { secret: this.envConfig.jwtRefreshSecret });
      if (payload.purpose !== 'reset-password') {
        throw new UnauthorizedException('Token reset password tidak valid');
      }

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw new NotFoundException('User tidak ditemukan');
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) },
      });

    
    } catch (error) {
      this.logger.error(`Reset password failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Token reset password tidak valid atau kadaluarsa');
    }
  }

  async sendMagicLink(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return;
    }

    const magicToken = this.jwtService.sign(
      { sub: user.id, email: user.email, purpose: 'magic-link' },
      { secret: this.envConfig.jwtRefreshSecret, expiresIn: '15m' },
    );

    const magicUrl = `${env.frontendUrl}/login?magic=${magicToken}`;

    const tpl = {
      subject: 'Magic Link Login - THS-THM',
      html: `<p>Klik link ini untuk login:</p><a href="${escapeHtml(magicUrl)}">Login</a><p>Link berlaku 15 menit.</p>`,
      text: `Login: ${magicUrl}`,
    };

    await this.mailService.sendMail({
      to: email,
      ...tpl,
      metadata: { module: 'auth', template: 'magicLink' },
    });

  }

  async loginWithMagicLink(token: string) {
    try {
      const payload = this.jwtService.verify(token, { secret: this.envConfig.jwtRefreshSecret });
      if (payload.purpose !== 'magic-link') {
        throw new UnauthorizedException('Token tidak valid');
      }

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new NotFoundException('User tidak ditemukan');

      const tokens = await this.generateTokens(user);
      return { user: await this.sanitizeUser(user), ...tokens };
    } catch {
      throw new UnauthorizedException('Token tidak valid atau kadaluarsa');
    }
  }

  async generateTokens(user: UserPayload & { refreshToken?: string | null }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.envConfig.jwtRefreshSecret,
      expiresIn: this.envConfig.jwtRefreshExpiresIn,
    });
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
    return { accessToken, refreshToken };
  }

  setRefreshTokenCookie(res: Response, refreshToken: string) {
    // expiresIn from env.validation.ts is a string like '7d', convert to seconds
    const expiresInSeconds = parseInt(this.envConfig.jwtRefreshExpiresIn); // Assuming '7d' is handled as 7 * 24 * 60 * 60 seconds
    const maxAge = expiresInSeconds * 1000; // in milliseconds

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: this.envConfig.nodeEnv === 'production',
      maxAge: maxAge, // Use maxAge for cookie expiry
      sameSite: 'lax',
      path: '/',
    });
  }

  clearRefreshTokenCookie(res: Response) {
    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: this.envConfig.nodeEnv === 'production',
      maxAge: 0, // Expire immediately
      sameSite: 'lax',
      path: '/',
    });
  }

  async findOrCreateOAuthUser(profile: OAuthUserProfile) {
    let user: {
      id: string;
      email: string;
      role: string;
      namaLengkap: string;
      rantingId: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      refreshToken?: string | null;
      passwordHash?: string;
    } | null = null;

    // If email is provided, look up by email (most common path)
    if (profile.email) {
      user = await this.prisma.user.findUnique({ where: { email: profile.email } });
    }

    // Fallback: look up via OAuth providerId (handles anonymous OAuth where email scope is denied)
    if (!user) {
      const oauthAccount = await this.prisma.oAuthAccount.findUnique({
        where: {
          provider_providerId: { provider: profile.provider, providerId: profile.providerId },
        },
        select: { userId: true },
      });
      if (oauthAccount) {
        user = await this.prisma.user.findUnique({ where: { id: oauthAccount.userId } });
      }
    }

    if (!user) {
      const syntheticEmail = profile.email || `${profile.providerId}@oauth.${profile.provider}.com`;
      const randomPassword = Math.random().toString(36).slice(-10);
      const passwordHash = await bcrypt.hash(randomPassword, 12);
      user = await this.prisma.user.create({
        data: {
          email: syntheticEmail,
          passwordHash,
          namaLengkap: profile.name,
          role: 'anggota',
        },
      });
    }

    await this.prisma.oAuthAccount.upsert({
      where: {
        provider_providerId: { provider: profile.provider, providerId: profile.providerId },
      },
      update: { email: profile.email, name: profile.name, photo: profile.photo, userId: user.id },
      create: {
        userId: user.id,
        provider: profile.provider,
        providerId: profile.providerId,
        email: profile.email,
        name: profile.name,
        photo: profile.photo,
      },
    });

    return { ...(await this.sanitizeUser(user)), refreshToken: await this.generateTokens(user).then((tokens) => tokens.refreshToken) };
  }

  /**
   * Strip sensitive fields from a user object and attach the member's
   * profile photo path (fotoPath) if available.
   */
  private async sanitizeUser(user: {
    id: string;
    email: string;
    namaLengkap: string;
    role: string;
    rantingId: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    passwordHash?: string;
    refreshToken?: string | null;
  }) {
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      passwordHash,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      refreshToken,
      ...safe
    } = user;

    // Attach profile photo from Anggota record (non-critical — fail silently)
    try {
      const anggota = await this.prisma.anggota.findFirst({
        where: { email: user.email },
        select: { fotoPath: true },
      });
      if (anggota?.fotoPath) {
        (safe as Record<string, unknown>).fotoPath = anggota.fotoPath;
      }
    } catch {
      // Non-critical — profile photo is optional
    }

    return safe as {
      id: string;
      email: string;
      namaLengkap: string;
      role: string;
      rantingId: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      fotoPath?: string;
    };
  }
}
