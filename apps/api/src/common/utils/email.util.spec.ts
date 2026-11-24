import { ConflictException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  assertEmailAvailable,
  mapUserEmailConflict,
  normalizeEmail,
  normalizeUserEmailData,
} from './email.util';

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });

  it('returns empty string for nullish input', () => {
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(undefined)).toBe('');
  });
});

describe('normalizeUserEmailData', () => {
  it('normalizes object, array, and nested upsert data', () => {
    expect(normalizeUserEmailData({ email: ' A@B.COM ' })).toEqual({ email: 'a@b.com' });
    expect(normalizeUserEmailData([{ email: ' A@B.COM ' }])).toEqual([{ email: 'a@b.com' }]);
    expect(
      normalizeUserEmailData({
        create: { email: ' A@B.COM ' },
        update: { email: ' C@D.COM ' },
      }),
    ).toEqual({
      create: { email: 'a@b.com' },
      update: { email: 'c@d.com' },
    });
  });
});

describe('mapUserEmailConflict', () => {
  const p2002 = (target: unknown) =>
    new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target },
    });

  it('maps email uniqueness errors to a friendly conflict', () => {
    const mapped = mapUserEmailConflict(p2002(['email'])) as ConflictException;
    expect(mapped).toBeInstanceOf(ConflictException);
    expect(mapped.message).toBe('Email sudah terdaftar');
  });

  it('leaves non-email uniqueness errors untouched', () => {
    const error = p2002(['phone']);
    expect(mapUserEmailConflict(error)).toBe(error);
  });
});

describe('assertEmailAvailable', () => {
  const findFirst = jest.fn();
  const prisma = { user: { findFirst } } as unknown as Pick<PrismaClient, 'user'>;

  it('throws ConflictException when email is used by another user', async () => {
    findFirst.mockResolvedValueOnce({ id: 'other' } as never);
    await expect(assertEmailAvailable(prisma, ' User@Example.COM ')).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: 'user@example.com', mode: 'insensitive' } },
      select: { id: true },
    });
  });

  it('excludes the current user on update', async () => {
    findFirst.mockResolvedValueOnce(null);
    await assertEmailAvailable(prisma, 'user@example.com', 'u1');
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: { equals: 'user@example.com', mode: 'insensitive' },
        id: { not: 'u1' },
      },
      select: { id: true },
    });
  });
});
