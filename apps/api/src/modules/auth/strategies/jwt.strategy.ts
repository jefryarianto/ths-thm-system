import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { env } from '../../../config/env.validation';
import { requestContextStore } from '../../../common/utils/request-context';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.jwtSecret,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        namaLengkap: true,
        isActive: true,
        distrikId: true,
        wilayahId: true,
        rantingId: true,
        // Fallback untuk record lama tanpa kolom org eksplisit.
        ranting: { select: { wilayahId: true, wilayah: { select: { distrikId: true } } } },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User tidak aktif atau tidak ditemukan');
    }

    const distrikId =
      user.role === 'superadmin'
        ? null
        : user.distrikId ?? user.ranting?.wilayah?.distrikId ?? null;
    const wilayahId =
      user.role === 'superadmin'
        ? null
        : user.wilayahId ?? user.ranting?.wilayahId ?? null;

    // Set tenant context (distrikId) from user — skip for superadmin
    const ctx = requestContextStore.getStore();
    if (ctx) {
      ctx.distrikId = distrikId;
      ctx.userId = user.id;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      rantingId: user.rantingId,
      distrikId: distrikId,
      wilayahId: wilayahId,
      namaLengkap: user.namaLengkap,
    };
  }
}
