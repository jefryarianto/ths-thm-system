import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface PersistentAuditParams {
  action: string;
  entity: string;
  entityId?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
}

/**
 * Persist audit trail ke tabel `audit_logs` (Prisma).
 * Best-effort: kegagalan menulis hanya di-warn, tidak memblokir request
 * karena logging audit tidak boleh mengganggu alur utama (login/refresh dll).
 */
@Injectable()
export class PersistentAuditService {
  private readonly logger = new Logger(PersistentAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: PersistentAuditParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: params.action,
          entity: params.entity,
          entityId: params.entityId ?? null,
          userId: params.userId ?? null,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          details: (params.details ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (err) {
      this.logger.warn(`Audit log gagal ditulis (${params.action}): ${(err as Error).message}`);
    }
  }
}