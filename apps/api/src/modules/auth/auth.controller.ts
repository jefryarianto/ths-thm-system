import { Controller, Post, Body, Get, Patch, Req, UseGuards, Res, Inject, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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
  MagicLinkDto,
  MagicLinkVerifyDto,
} from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Request, Response } from 'express';
import { env } from '../../config/env.validation';

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
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    // Pass `res` so the service sets the HttpOnly cookie internally
    const result = await this.authService.login(dto, res);
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
    const result = await this.authService.refreshToken(refreshToken);
    this.authService.setRefreshTokenCookie(res, result.refreshToken);
    const { refreshToken: _, ...rest } = result;
    return rest;
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

  @Post('magic-link')
  @Public()
  @ApiOperation({ summary: 'Kirim tautan ajaib' })
  sendMagicLink(@Body() dto: MagicLinkDto) {
    return this.authService.sendMagicLink(dto.email);
  }

  @Post('magic-link/verify')
  @Public()
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

    const redirectUrl = `${this.envConfig.frontendUrl}/login?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`;
    return res.redirect(redirectUrl);
  }

}
