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
      include: {
        ranting: {
          include: {
            wilayah: {
              select: { distrikId: true },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User tidak aktif atau tidak ditemukan');
    }

    const distrikId = user.role === 'superadmin' ? null : user.ranting?.wilayah?.distrikId;

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
      namaLengkap: user.namaLengkap,
    };
  }
}
