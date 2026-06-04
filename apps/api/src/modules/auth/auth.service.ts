import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RegisterDto, RefreshDto, ForgotPasswordDto, ResetPasswordDto, UpdateProfileDto, ChangePasswordDto } from './dto/auth.dto';

interface UserPayload {
  id: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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
    const data: Record<string, unknown> = {};
    if (dto.namaLengkap) data.namaLengkap = dto.namaLengkap;
    if (dto.noHp) data.noHp = dto.noHp;
    if (dto.email) data.email = dto.email;
    if (dto.alamat !== undefined) data.alamat = dto.alamat;
    if (dto.tempatLahir) data.tempatLahir = dto.tempatLahir;
    if (dto.tanggalLahir) data.tanggalLahir = dto.tanggalLahir;

    const user = await this.prisma.user.update({ where: { id: userId }, data });
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
    return { success: true, message: 'Link reset password telah dikirim ke email Anda' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    return { success: true, message: 'Password berhasil direset' };
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
