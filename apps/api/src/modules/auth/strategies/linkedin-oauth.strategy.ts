import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-linkedin-oauth2';
import { AuthService } from '../auth.service';

@Injectable()
export class LinkedInOAuthStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.LINKEDIN_CLIENT_ID || 'missing-linkedin-client-id',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || 'missing-linkedin-client-secret',
      callbackURL: `${process.env.API_URL || 'http://localhost:3001'}/api/auth/linkedin/callback`,
      scope: ['r_emailaddress', 'r_liteprofile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: Error | null, user?: any) => void,
  ) {
    const { id, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value;
    const name = displayName;
    const photo = photos?.[0]?.value;

    try {
      const user = await this.authService.findOrCreateOAuthUser({
        provider: 'linkedin',
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
