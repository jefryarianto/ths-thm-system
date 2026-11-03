import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleOAuthStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly configured: boolean;

  constructor(private readonly authService: AuthService) {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const configured = Boolean(clientID && clientSecret);

    // Jangan melempar di constructor: provider ini selalu di-instansiasi saat
    // boot (mis. swagger:export / smoke test tanpa kredensial Google), dan
    // error di sini menggagalkan seluruh AppModule. Sebagai gantinya strategi
    // tetap terdaftar tetapi menolak request saat dipakai (lihat authenticate).
    super({
      clientID: clientID || 'google-oauth-not-configured',
      clientSecret: clientSecret || 'google-oauth-not-configured',
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        `${process.env.API_URL || 'http://localhost:3001'}/api/auth/google/callback`,
      scope: ['email', 'profile'],
    });

    this.configured = configured;
  }

  authenticate(req: Request, options?: unknown): void {
    if (!this.configured) {
      throw new UnauthorizedException('Google OAuth credentials not configured');
    }
    super.authenticate(req, options);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) {
    const { id, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value;
    const name = displayName;
    const photo = photos?.[0]?.value;

    try {
      const user = await this.authService.findOrCreateOAuthUser({
        provider: 'google',
        providerId: id,
        email,
        name,
        photo,
      });
      done(null, user);
    } catch (err) {
      done(err as Error, false);
    }
  }
}
