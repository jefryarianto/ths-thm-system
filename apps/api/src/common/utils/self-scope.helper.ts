import { ForbiddenException } from '@nestjs/common';

/**
 * User shape yang tersedia di req.user (dari JwtStrategy).
 */
export interface SelfScopeUser {
  email?: string;
  namaLengkap?: string;
  role?: string;
}

/** Prisma API minimum yang dipakai helper ini (subset dari PrismaService). */
export interface SelfScopePrisma {
  anggota: {
    findFirst(args: {
      where: Record<string, unknown>;
      select: { id: true };
    }): Promise<{ id: string } | null>;
    findMany(args: {
      where: Record<string, unknown>;
      select: { id: true };
    }): Promise<{ id: string }[]>;
  };
}

/**
 * Resolve id anggota milik user yang login.
 * Pencocokan: email persis dulu; lalu fallback nama lengkap (case-insensitive,
 * hanya untuk anggota ber-email kosong & hasil unik) — konsisten dengan
 * MembersService.findByEmail.
 */
export async function resolveOwnMemberId(
  prisma: SelfScopePrisma,
  user: SelfScopeUser,
): Promise<string | null> {
  if (user.email) {
    const byEmail = await prisma.anggota.findFirst({
      where: { email: user.email, deletedAt: null },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  if (user.namaLengkap && user.namaLengkap.trim()) {
    const byName = await prisma.anggota.findMany({
      where: {
        namaLengkap: { equals: user.namaLengkap.trim(), mode: 'insensitive' },
        OR: [{ email: null }, { email: '' }],
        deletedAt: null,
      },
      select: { id: true },
    });
    if (byName.length === 1) return byName[0].id;
  }

  return null;
}

/**
 * Enforce self-scope: user level "self" (anggota/penguji) hanya boleh mengakses
 * data anggota miliknya sendiri. Role admin (superadmin / admin_*) dilewati —
 * cakupan ranting/wilayah/distrik mereka ditangani ScopeGuard & service.
 *
 * @throws ForbiddenException bila anggota/penguji mencoba akses id anggota lain.
 */
export async function assertSelfMember(
  prisma: SelfScopePrisma,
  user?: SelfScopeUser | null,
  resourceMemberId?: string,
): Promise<void> {
  if (!user || !resourceMemberId || (user.role !== 'anggota' && user.role !== 'penguji')) return;

  const ownId = await resolveOwnMemberId(prisma, user);
  if (!ownId || ownId !== resourceMemberId) {
    throw new ForbiddenException('Akses ditolak: hanya data anggota Anda sendiri');
  }
}
