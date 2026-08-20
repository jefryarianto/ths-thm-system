import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
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
  ForceChangePasswordDto,
} from './dto/auth.dto';
import { ApprovalService } from '../approvals/approval.service';
import { validateImageMagicBytes } from '../../common/utils/image-upload.util';

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
    // Identifier bisa berupa email ATAU nomor HP
    const rawIdentifier = dto.identifier.trim();
    const cleaned = rawIdentifier.replace(/[\s\-().]/g, '');
    const isPhone = /^\+?[0-9]{10,15}$/.test(cleaned);
    let user = isPhone
      ? await this.prisma.user.findUnique({ where: { phone: cleaned } })
      : await this.prisma.user.findUnique({ where: { email: rawIdentifier } });

    // Fallback #1: email case-insensitive (Postgres findUnique bersifat case-sensitive)
    if (!user && !isPhone) {
      user = await this.prisma.user.findFirst({
        where: { email: { equals: rawIdentifier, mode: 'insensitive' } },
      });
    }

    // Fallback #2: nomor HP tersimpan di tabel `anggota.no_hp` (bukan `users.phone`,
    // yang sering kosong). Cari anggota dengan format nomor dinormalisasi
    // (+62xxx == 0xxx), lalu hubungkan ke user via email / nama lengkap.
    if (!user && isPhone) {
      const anggota = await this.findUserByMemberPhone(cleaned);
      if (anggota) {
        let byEmail = anggota.email
          ? await this.prisma.user.findFirst({
              where: { email: { equals: anggota.email, mode: 'insensitive' } },
            })
          : null;
        if (!byEmail && anggota.namaLengkap) {
          byEmail = await this.prisma.user.findFirst({
            where: { namaLengkap: { equals: anggota.namaLengkap.trim(), mode: 'insensitive' } },
          });
        }
        if (byEmail) {
          user = byEmail;
          // Self-healing: salin nomor HP ke tabel users agar lookup berikutnya cepat
          try {
            await this.prisma.user.update({
              where: { id: byEmail.id },
              data: { phone: anggota.noHp },
            });
          } catch {
            // Nomor mungkin bentrok dengan user lain — abaikan, fallback tetap jalan
          }
        }
      }
    }

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email/HP atau password salah');
    }

    // Wajib ganti password (login pertama kali / credential direset admin)
    if (user.mustChangePassword) {
      const resetToken = this.jwtService.sign(
        { sub: user.id, email: user.email, purpose: 'force-change-password' },
        { secret: this.envConfig.jwtRefreshSecret, expiresIn: '1h' },
      );
      return {
        mustChangePassword: true,
        resetToken,
        user: await this.sanitizeUser(user),
      };
    }

    const tokens = await this.generateTokens(user);
    if (response) {
      this.setRefreshTokenCookie(response, tokens.refreshToken);
      return { user: await this.sanitizeUser(user), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    }
    return { user: await this.sanitizeUser(user), ...tokens };
  }

  /**
   * Normalisasi nomor HP: buang spasi/tanda baca, dan samakan format
   * `+62xxx` / `62xxx` → `0xxx` supaya pencocokan konsisten.
   */
  private normalizePhone(raw: string): string {
    let s = raw.replace(/[\s\-().]/g, '');
    if (s.startsWith('+62')) s = '0' + s.slice(3);
    else if (s.startsWith('62')) s = '0' + s.slice(2);
    return s;
  }

  /**
   * Cari anggota berdasarkan nomor HP (format dinormalisasi) di tabel `anggota`.
   * Mengembalikan anggota pertama yang cocok, atau null.
   */
  private async findUserByMemberPhone(phoneInput: string) {
    const target = this.normalizePhone(phoneInput);
    const candidates = await this.prisma.anggota.findMany({
      where: {
        noHp: { not: null },
        NOT: { noHp: '' },
      },
      select: { noHp: true, email: true, namaLengkap: true },
      take: 2000,
    });
    return (
      candidates.find((c) => c.noHp && this.normalizePhone(c.noHp) === target) || null
    );
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
    const profile = await this.sanitizeUser(user);

    // Lampirkan field profil anggota (noHp, alamat, tempatLahir, tanggalLahir) supaya
    // aplikasi mobile bisa menampilkan data lama di form Edit Profil. Cocokkan via
    // email; fallback via nama lengkap (email kosong hasil import CSV) — sama seperti
    // updateProfile. Non-critical: gagal diam-diam bila anggota tidak ditemukan.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prisma = this.prisma as any;
      const select = {
        noHp: true,
        alamat: true,
        tempatLahir: true,
        tanggalLahir: true,
        fotoPath: true,
      };
      let anggota = await prisma.anggota.findFirst({
        where: { email: user.email, deletedAt: null },
        select,
      });
      if (!anggota && user.namaLengkap?.trim()) {
        const byName = await prisma.anggota.findMany({
          where: {
            namaLengkap: { equals: user.namaLengkap.trim(), mode: 'insensitive' },
            OR: [{ email: null }, { email: '' }],
            deletedAt: null,
          },
          select,
        });
        if (byName.length === 1) anggota = byName[0];
      }
      if (anggota) {
        const target = profile as Record<string, unknown>;
        if (anggota.noHp) target.noHp = anggota.noHp;
        if (anggota.alamat) target.alamat = anggota.alamat;
        if (anggota.tempatLahir) target.tempatLahir = anggota.tempatLahir;
        if (anggota.tanggalLahir) target.tanggalLahir = anggota.tanggalLahir;
        if (anggota.fotoPath) target.fotoPath = anggota.fotoPath;
      }
    } catch {
      // Non-critical — field profil anggota opsional
    }

    return profile;
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
   * Upload foto profil sendiri (mobile): simpan ke uploads, update `anggota.fotoPath`,
   * dan generate versi tanpa background (`.bg.png`) ala SIM untuk kartu.
   */
  async uploadMyPhoto(userId: string, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File foto harus diupload');
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { unlinkSync } = require('fs');
    if (!validateImageMagicBytes(file.path)) {
      try { unlinkSync(file.path); } catch { /* best-effort */ }
      throw new BadRequestException('File tidak valid: format gambar tidak dikenali.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      try { unlinkSync(file.path); } catch { /* best-effort */ }
      throw new NotFoundException('User tidak ditemukan');
    }

    // Cocokkan anggota via email; fallback via nama lengkap (email kosong hasil import)
    let anggota = await this.prisma.anggota.findFirst({ where: { email: user.email } });
    if (!anggota && user.namaLengkap?.trim()) {
      const byName = await this.prisma.anggota.findMany({
        where: {
          namaLengkap: { equals: user.namaLengkap.trim(), mode: 'insensitive' },
          OR: [{ email: null }, { email: '' }],
        },
      });
      if (byName.length === 1) anggota = byName[0];
    }
    if (!anggota) {
      try { unlinkSync(file.path); } catch { /* best-effort */ }
      throw new NotFoundException('Data anggota tidak ditemukan. Hubungi admin.');
    }

    await this.prisma.anggota.update({
      where: { id: anggota.id },
      data: { fotoPath: file.filename },
    });

    // Generate `.bg.png` (tanpa background) — non-critical, lazy middleware sebagai fallback
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { removePhotoBackground } = require('../../common/utils/photo-bg.util');
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const out = await removePhotoBackground(fs.readFileSync(file.path));
      fs.writeFileSync(path.join(uploadDir, `${file.filename}.bg.png`), out);
    } catch {
      // Non-critical
    }

    return {
      success: true,
      data: { fotoPath: file.filename, url: `/api/uploads/${file.filename}` },
      message: 'Foto berhasil diupload',
    };
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

      // Calculate missing fields — only check fields the user can edit from the mobile app.
      // Admin-set fields (jenisKelamin, tempatDadar, tahunDadar, tingkat) are excluded
      // because the user has no way to fill them, so they shouldn't trigger "incomplete".
      const missingFields: string[] = [];
      if (!member.namaLengkap) missingFields.push('nama_lengkap');
      if (!member.tempatLahir) missingFields.push('tempat_lahir');
      if (!member.tanggalLahir) missingFields.push('tanggal_lahir');
      if (!member.alamat) missingFields.push('alamat');
      if (!member.noHp) missingFields.push('no_hp');
      if (!member.email) missingFields.push('email');

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

      if (statusData === 'complete') {
        // Data is complete → clear stale 'data_incomplete' notifications
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.prisma as any).notifikasi.deleteMany({
          where: { userId: anggotaId, tipe: 'data_incomplete' },
        });

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
      } else {
        // Data still incomplete → update existing 'data_incomplete' notification text
        // so it always reflects the current missing fields (no stale messages)
        const missingList = missingFields.map((f) => f.replace(/_/g, ' ')).join(', ');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existing = await (this.prisma as any).notifikasi.findFirst({
          where: { userId: anggotaId, tipe: 'data_incomplete', isRead: false },
          orderBy: { createdAt: 'desc' },
        });
        if (existing) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (this.prisma as any).notifikasi.update({
            where: { id: existing.id },
            data: {
              judul: '📋 Data Anggota Belum Lengkap',
              isi: `Data keanggotaan Anda masih belum lengkap. Segera lengkapi: ${missingList}.`,
            },
          });
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

  /**
   * Ubah password saat login pertama kali (mustChangePassword = true).
   * Token sementara diambil dari response login dan diverifikasi di sini.
   */
  async forceChangePassword(dto: ForceChangePasswordDto) {
    try {
      const payload = this.jwtService.verify(dto.token, {
        secret: this.envConfig.jwtRefreshSecret,
      });
      if (payload.purpose !== 'force-change-password') {
        throw new UnauthorizedException('Token ubah password tidak valid');
      }

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw new NotFoundException('User tidak ditemukan');
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await bcrypt.hash(dto.newPassword, 12),
          mustChangePassword: false,
        },
      });

      return { success: true, message: 'Password berhasil diubah' };
    } catch (error) {
      this.logger.error(`Force change password failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Token ubah password tidak valid atau kadaluarsa');
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
    phone?: string | null;
    mustChangePassword?: boolean;
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
      phone?: string | null;
      mustChangePassword?: boolean;
      fotoPath?: string;
    };
  }
}
