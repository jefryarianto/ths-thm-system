import { Controller, Post, Body, Get, Patch, Req, UseGuards, Res, Inject, UnauthorizedException, UseInterceptors, UploadedFile, Delete, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  RefreshDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  ChangePasswordDto,
  ForceChangePasswordDto,
  MagicLinkDto,
  MagicLinkVerifyDto,
} from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Request, Response } from 'express';
import { env } from '../../config/env.validation';
import { buildImageUploadOptions } from '../../common/utils/image-upload.util';

function parseCookie(cookieHeader: string, name: string): string | undefined {
  const cookies = cookieHeader.split(';').map((c) => c.trim().split('='));
  for (const [key, value] of cookies) {
    if (key === name) return decodeURIComponent(value);
  }
  return undefined;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject('ENV') private readonly envConfig: typeof env,
  ) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Login pengguna' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Pass `res` so the service sets the HttpOnly cookie internally
    const result = await this.authService.login(dto, res, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return result;
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Registrasi pengguna baru' })
  register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.register(dto, res);
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh token akses' })
  async refresh(@Req() req: Request, @Body() dto: RefreshDto, @Res({ passthrough: true }) res: Response) {
    // Mobile mengirim refreshToken via body; web via httpOnly cookie — terima keduanya
    const refreshToken = dto.refreshToken || parseCookie(req.headers.cookie || '', 'refreshToken');
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token tidak ditemukan');
    }
    const result = await this.authService.refreshToken(refreshToken, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    this.authService.setRefreshTokenCookie(res, result.refreshToken);
    // Kembalikan refreshToken (rotasi) agar mobile bisa menyimpan token baru;
    // cookie tetap dipakai web.
    return result;
  }

  @Post('forgot')
  @Public()
  @ApiOperation({ summary: 'Lupa kata sandi' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset')
  @Public()
  @ApiOperation({ summary: 'Reset kata sandi' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('force-change-password')
  @Public()
  @ApiOperation({ summary: 'Ubah kata sandi saat login pertama kali (mustChangePassword)' })
  forceChangePassword(@Body() dto: ForceChangePasswordDto, @Req() req: Request) {
    return this.authService.forceChangePassword(dto, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Keluar — hapus refresh token (server + cookie)' })
  async logout(@CurrentUser() user: { id: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = parseCookie(req.headers.cookie || '', 'refreshToken');
    this.authService.clearRefreshTokenCookie(res);
    await this.authService.logout(user.id, refreshToken, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return { success: true, message: 'Berhasil keluar' };
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Daftar sesi aktif' })
  listSessions(@CurrentUser() user: { id: string }) {
    return this.authService.listSessions(user.id);
  }

  @Delete('sessions/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cabut sesi tertentu (logout perangkat lain)' })
  async revokeSession(
    @CurrentUser() user: { id: string },
    @Param('id') sessionId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const wasCurrent = await this.authService.revokeSession(user.id, sessionId, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    if (wasCurrent) {
      this.authService.clearRefreshTokenCookie(res);
    }
    return { success: true, message: 'Sesi dicabut' };
  }

  @Post('admin/unlock')
  @Roles('superadmin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buka kunci akun yang terkunci (anti brute-force)' })
  async unlockAccount(@Body() dto: { userId: string }, @Req() req: Request) {
    return this.authService.unlockAccount(dto.userId, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ambil profil pengguna' })
  getProfile(@CurrentUser() user: { id: string }) {
    return this.authService.getProfile(user.id);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Perbarui profil pengguna' })
  updateProfile(@CurrentUser() user: { id: string }, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Patch('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ubah kata sandi' })
  changePassword(@CurrentUser() user: { id: string }, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto);
  }

  @Post('me/photo')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload foto profil sendiri (mobile — kamera/galeri)' })
  @UseInterceptors(FileInterceptor('photo', buildImageUploadOptions('profile')))
  uploadMyPhoto(@CurrentUser() user: { id: string }, @UploadedFile() file: Express.Multer.File) {
    return this.authService.uploadMyPhoto(user.id, file);
  }

  @Post('magic-link')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @ApiOperation({ summary: 'Kirim tautan ajaib' })
  sendMagicLink(@Body() dto: MagicLinkDto) {
    return this.authService.sendMagicLink(dto.email);
  }

  @Post('magic-link/verify')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @ApiOperation({ summary: 'Verifikasi tautan ajaib' })
  verifyMagicLink(@Body() dto: MagicLinkVerifyDto) {
    return this.authService.loginWithMagicLink(dto.token);
  }

  // ── OAuth Endpoints ──

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Login dengan Google' })
  googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Callback login Google' })
  async googleAuthCallback(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user;
    if (!user) {
      return res.redirect(
        `${this.envConfig.frontendUrl}/login?error=oauth_failed`,
      );
    }

    const tokens = await this.authService.generateTokens(user);
    this.authService.setRefreshTokenCookie(res, tokens.refreshToken);
    this.authService.logAuthAudit('LOGIN', user.id, { method: 'google' }, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    const redirectUrl = `${this.envConfig.frontendUrl}/login?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`;
    return res.redirect(redirectUrl);
  }

}
