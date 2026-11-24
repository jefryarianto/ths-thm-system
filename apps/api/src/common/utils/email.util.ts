import { ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export function normalizeEmail(raw?: string | null): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

function normalizeRecord(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeRecord);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(source)) {
    if (key === 'email' && typeof item === 'string') {
      result[key] = normalizeEmail(item);
    } else if ((key === 'create' || key === 'update') && item && typeof item === 'object') {
      result[key] = normalizeRecord(item);
    } else {
      result[key] = item;
    }
  }

  return result;
}

export function normalizeUserEmailData<T>(data: T): T {
  return normalizeRecord(data) as T;
}

export async function assertEmailAvailable(
  prisma: Pick<PrismaClient, 'user'>,
  email: string,
  excludeUserId?: string,
): Promise<void> {
  const existing = await prisma.user.findFirst({
    where: {
      email: { equals: normalizeEmail(email), mode: 'insensitive' },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new ConflictException('Email sudah terdaftar');
  }
}
