import { Controller, Post, Body, Get, Patch, Req, Res, UseGuards } from '@nestjs/common';
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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Login pengguna' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Registrasi pengguna baru' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh token akses' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshToken(dto);
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
  googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user;
    if (!user) {
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`,
      );
    }
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/login?token=${user.accessToken}&refresh=${user.refreshToken}`;
    return res.redirect(redirectUrl);
  }

  @Get('linkedin')
  @Public()
  @UseGuards(AuthGuard('linkedin'))
  @ApiOperation({ summary: 'Login dengan LinkedIn' })
  linkedinAuth() {
    // Guard redirects to LinkedIn
  }

  @Get('linkedin/callback')
  @Public()
  @UseGuards(AuthGuard('linkedin'))
  @ApiOperation({ summary: 'Callback login LinkedIn' })
  linkedinAuthCallback(@Req() req: Request, @Res() res: Response) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user;
    if (!user) {
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`,
      );
    }
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/login?token=${user.accessToken}&refresh=${user.refreshToken}`;
    return res.redirect(redirectUrl);
  }
}
