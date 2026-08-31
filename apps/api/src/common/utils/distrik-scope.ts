import { ForbiddenException } from '@nestjs/common';
import { ScopedRequest } from '../interfaces/user-scope.interface';

/**
 * Resolve distrikId untuk operasi tulis yang mendukung scope distrik
 * (penandatangan, ttd, stempel, penugasan dokumen).
 *
 * - superadmin bebas menentukan scope (null = global/nasional).
 * - Peran lain terkunci ke distrik pada scope-nya sendiri; menulis data
 *   distrik lain → 403.
 */
export function resolveWriteDistrikId(req: ScopedRequest | undefined, requested?: string | null): string | null {
  if (req?.user?.role === 'superadmin') return requested ?? null;
  const own = req?.scope?.distrikId;
  if (!own) throw new ForbiddenException('Cakupan distrik tidak tersedia untuk peran Anda');
  if (requested && requested !== own) {
    throw new ForbiddenException('Anda hanya dapat mengelola data distrik Anda sendiri');
  }
  return own;
}

/** DistrikId efektif untuk operasi baca: non-superadmin mengikuti scope-nya. */
export function resolveReadDistrikId(req: ScopedRequest | undefined, requested?: string | null): string | null {
  if (req?.user?.role === 'superadmin') return requested ?? null;
  return req?.scope?.distrikId ?? requested ?? null;
}