import { Injectable, UnauthorizedException, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { env } from '../../config/env.validation';
import { LoginDto, RegisterDto, RefreshDto, ForgotPasswordDto, ResetPasswordDto, UpdateProfileDto, ChangePasswordDto } from './dto/auth.dto';

interface UserPayload {
  id: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email atau password salah');
    }
    const tokens = await this.generateTokens(user);
    return { success: true, data: { user: this.sanitizeUser(user), ...tokens } };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email sudah terdaftar');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const role = (dto.role as Role) || ('anggota' as Role);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, namaLengkap: dto.namaLengkap, role, rantingId: dto.rantingId },
    });
    const tokens = await this.generateTokens(user);
    return { success: true, data: { user: this.sanitizeUser(user), ...tokens } };
  }

  async refreshToken(dto: RefreshDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.refreshToken !== dto.refreshToken) throw new UnauthorizedException('Token tidak valid');
      const tokens = await this.generateTokens(user);
      return { success: true, data: tokens };
    } catch { throw new UnauthorizedException('Token tidak valid atau kadaluarsa'); }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return { success: true, data: this.sanitizeUser(user) };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Update User model (only fields that exist on the User schema)
    const userData: Record<string, unknown> = {};
    if (dto.namaLengkap) userData.namaLengkap = dto.namaLengkap;
    if (dto.email) userData.email = dto.email;

    const user = await this.prisma.user.update({ where: { id: userId }, data: userData });

    // Update Anggota model (profile fields like noHp, alamat, tempatLahir, tanggalLahir)
    // Only triggers when profile-specific fields are provided
    const hasAnggotaFields = dto.noHp !== undefined || dto.alamat !== undefined || dto.tempatLahir !== undefined || dto.tanggalLahir !== undefined;
    const hasUserFields = dto.namaLengkap !== undefined || dto.email !== undefined;

    if (hasAnggotaFields) {
      const anggotaData: Record<string, unknown> = {};
      if (dto.namaLengkap) anggotaData.namaLengkap = dto.namaLengkap;
      if (dto.noHp !== undefined) anggotaData.noHp = dto.noHp;
      if (dto.alamat !== undefined) anggotaData.alamat = dto.alamat;
      if (dto.tempatLahir) anggotaData.tempatLahir = dto.tempatLahir;
      if (dto.tanggalLahir) anggotaData.tanggalLahir = new Date(dto.tanggalLahir);
      if (dto.email !== undefined) anggotaData.email = dto.email;

      const anggota = await this.prisma.anggota.findFirst({
        where: { email: user.email },
      });

      if (anggota) {
        await this.prisma.anggota.update({
          where: { id: anggota.id },
          data: anggotaData,
        });
      } else {
        console.warn(`updateProfile: No Anggota record found for user ${userId} (email: ${user.email}) — profile fields not synced`);
      }
    }

    return { success: true, data: this.sanitizeUser(user) };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Password lama salah');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) } });
    return { success: true, message: 'Password berhasil diubah' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      return { success: true, message: 'Link reset password telah dikirim ke email Anda' };
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id, email: user.email, purpose: 'reset-password' },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '1h' },
    );

    const resetUrl = `${env.frontendUrl}/reset-password?token=${resetToken}`;

    await this.mailService.sendMail({
      to: user.email,
      subject: 'Reset Password — THS-THM System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a56db;">Reset Password</h1>
          <p>Halo <strong>${user.namaLengkap}</strong>,</p>
          <p>Kami menerima permintaan reset password untuk akun Anda.</p>
          <p>Klik tombol di bawah ini untuk mereset password Anda. Link ini berlaku selama <strong>1 jam</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p>Atau copy link berikut ke browser:</p>
          <p style="color: #6b7280; font-size: 14px;">${resetUrl}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            Jika Anda tidak meminta reset password, abaikan email ini.
          </p>
        </div>
      `,
    });

    return { success: true, message: 'Link reset password telah dikirim ke email Anda' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    try {
      const payload = this.jwtService.verify(dto.token, { secret: process.env.JWT_REFRESH_SECRET });
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

      return { success: true, message: 'Password berhasil direset. Silakan login dengan password baru.' };
    } catch (error) {
      this.logger.error(`Reset password failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Token reset password tidak valid atau kadaluarsa');
    }
  }

  private async generateTokens(user: UserPayload & { refreshToken?: string | null }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: Record<string, unknown>) {
    const { passwordHash: _, refreshToken: __, ...sanitized } = user;
    return sanitized;
  }
}
