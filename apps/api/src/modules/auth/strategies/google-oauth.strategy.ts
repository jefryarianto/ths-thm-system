import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleOAuthStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'missing-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'missing-google-client-secret',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.API_URL || 'http://localhost:3001'}/api/auth/google/callback`,
      scope: ['email', 'profile'],
    });
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
