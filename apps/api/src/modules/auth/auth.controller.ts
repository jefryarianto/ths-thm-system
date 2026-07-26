import { Controller, Post, Body, Get, Patch, Req, UseGuards, Res, Inject } from '@nestjs/common';
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
    const { data: result } = await this.authService.login(dto, res);
    // When `res` is provided, login() omits refreshToken from the response body
    return { success: true, data: result };
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
  async refresh(@Body() dto: RefreshDto, @Res({ passthrough: true }) res: Response) {
    const { data: result } = await this.authService.refreshToken(dto);
    this.authService.setRefreshTokenCookie(res, result.refreshToken);
    // Hapus refresh token dari body respons
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refreshToken: _, ...rest } = result;
    return { success: true, data: rest };
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

    // Set refresh token as HttpOnly cookie
    this.authService.setRefreshTokenCookie(res, user.refreshToken);

    // Redirect with only access token
    const redirectUrl = `${this.envConfig.frontendUrl}/login?token=${user.accessToken}`;
    return res.redirect(redirectUrl);
  }

}
