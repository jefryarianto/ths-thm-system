import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DECORATORS } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  SendNotificationDto,
  BroadcastNotificationDto,
  SendToRoleDto,
} from './dto/notification.dto';

const KTA_TYPES = [
  'kta_submitted',
  'kta_rejected',
  'kta_approved',
  'kta_fee_notification',
  'kta_payment_verified',
  'kta_generated',
  'kta_approval_request',
  'kta_payment_setup',
  'kta_escalation',
  'kta_escalation_upper',
];

const GENERIC_TYPES = ['badge_earned', 'approval_request', 'approval_result', 'forum_deleted'];

function schemaTipeNotifikasi(): string[] {
  const schema = readFileSync(join(__dirname, '../../../prisma/schema.prisma'), 'utf8');
  const block = schema.match(/enum\s+TipeNotifikasi\s*\{([\s\S]*?)\}/);
  expect(block).not.toBeNull();
  return (block as RegExpMatchArray)[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('//'));
}

function swaggerTipeEnum(dto: new (...args: never[]) => object): string[] {
  const metadata = Reflect.getMetadata(
    DECORATORS.API_MODEL_PROPERTIES,
    dto.prototype,
    'tipe',
  ) as { enum?: string[] } | undefined;
  return metadata?.enum ?? [];
}

describe('notification type registry', () => {
  it('declares all KTA notification values in the Prisma TipeNotifikasi enum', () => {
    const values = schemaTipeNotifikasi();
    for (const tipe of KTA_TYPES) {
      expect(values).toContain(tipe);
    }
    expect(values).toContain('status_klaim');
  });

  it('registers KTA and referenced generic types in NOTIFICATION_TYPES', () => {
    const keys = NotificationsService.NOTIFICATION_TYPES.map((type) => type.key);
    for (const tipe of [...KTA_TYPES, ...GENERIC_TYPES, 'status_klaim']) {
      expect(keys).toContain(tipe);
    }
  });

  it.each([
    ['SendNotificationDto', SendNotificationDto],
    ['BroadcastNotificationDto', BroadcastNotificationDto],
    ['SendToRoleDto', SendToRoleDto],
  ])('exposes KTA and generic types in %s Swagger enum', (_name, dto) => {
    const values = swaggerTipeEnum(dto);
    for (const tipe of [...KTA_TYPES, ...GENERIC_TYPES, 'status_klaim']) {
      expect(values).toContain(tipe);
    }
  });
});
