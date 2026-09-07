import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleOAuthStrategy } from './strategies/google-oauth.strategy';
import { GoogleOAuthEnabledGuard } from './guards/google-oauth-enabled.guard';
import { env } from '../../config/env.validation';
import { ApprovalModule } from '../approvals/approval.module';
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: env.jwtSecret,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
    }),
    ApprovalModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleOAuthStrategy,
    GoogleOAuthEnabledGuard,
    {
      provide: 'ENV',
      useValue: env,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
