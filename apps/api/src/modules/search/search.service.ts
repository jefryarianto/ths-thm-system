import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { UserScope } from '../../common/interfaces/user-scope.interface';

export interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
}

export interface SearchResults {
  query: string;
  total: number;
  groups: Record<string, { count: number; items: SearchResultItem[] }>;
}

const DEFAULT_LIMIT = 8;

/**
 * Pencarian gabungan lintas entitas (anggota, calon, kegiatan, latihan, user,
 * dokumen) memakai ILIKE (`contains` + `mode: insensitive`) — setara full-text
 * sederhana di PostgreSQL. Hasil dikelompokkan per tipe untuk UI.
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
  ) {}

  async search(
    query: string,
    scope?: UserScope,
    types: string[] = ['all'],
    limit: number = DEFAULT_LIMIT,
  ): Promise<SearchResults> {
    const q = (query || '').trim();
    if (q.length < 2) {
      return { query: q, total: 0, groups: {} };
    }

    const perGroup = Math.min(Math.max(limit, 1), 50);
    const wanted = (t: string) => types.includes('all') || types.includes(t);
    const groups: SearchResults['groups'] = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma: any = this.prisma;

    const membersScope = this.scopeHelper.buildScopeFilter(scope ?? {}, 'ranting');

    if (wanted('members')) {
      const rows = await prisma.anggota.findMany({
        where: {
          deletedAt: null,
          ...membersScope,
          OR: [
            { namaLengkap: { contains: q, mode: 'insensitive' } },
            { nomorAnggota: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { noHp: { contains: q, mode: 'insensitive' } },
            { alamat: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, namaLengkap: true, nomorAnggota: true, email: true },
        take: perGroup,
        orderBy: { namaLengkap: 'asc' },
      });
      groups.members = {
        count: rows.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: rows.map((m: any) => ({
          id: m.id,
          type: 'members',
          title: m.namaLengkap,
          subtitle: [m.nomorAnggota, m.email].filter(Boolean).join(' • '),
        })),
      };
    }

    if (wanted('candidates')) {
      const rows = await prisma.calonAnggota.findMany({
        where: {
          ...this.scopeHelper.buildScopeFilter(scope ?? {}, 'ranting'),
          OR: [
            { namaLengkap: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { noHp: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, namaLengkap: true, email: true, status: true },
        take: perGroup,
        orderBy: { namaLengkap: 'asc' },
      });
      groups.candidates = {
        count: rows.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: rows.map((c: any) => ({
          id: c.id,
          type: 'candidates',
          title: c.namaLengkap,
          subtitle: `Calon • ${c.status}`,
        })),
      };
    }

    if (wanted('activities')) {
      const rows = await prisma.kegiatan.findMany({
        where: {
          OR: [
            { nama: { contains: q, mode: 'insensitive' } },
            { lokasi: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, nama: true, lokasi: true, tipe: true },
        take: perGroup,
        orderBy: { nama: 'asc' },
      });
      groups.activities = {
        count: rows.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: rows.map((k: any) => ({
          id: k.id,
          type: 'activities',
          title: k.nama,
          subtitle: `Kegiatan • ${k.lokasi || k.tipe}`,
        })),
      };
    }

    if (wanted('trainings')) {
      const rows = await prisma.latihan.findMany({
        where: {
          ...this.scopeHelper.buildScopeFilter(scope ?? {}, 'ranting'),
          OR: [
            { jenisMateri: { contains: q, mode: 'insensitive' } },
            { lokasi: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, jenisMateri: true, lokasi: true, hariTanggal: true },
        take: perGroup,
        orderBy: { hariTanggal: 'desc' },
      });
      groups.trainings = {
        count: rows.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: rows.map((t: any) => ({
          id: t.id,
          type: 'trainings',
          title: t.jenisMateri || 'Latihan',
          subtitle: t.hariTanggal.toISOString().slice(0, 10) + (t.lokasi ? ` • ${t.lokasi}` : ''),
        })),
      };
    }

    if (wanted('users')) {
      const rows = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { namaLengkap: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, namaLengkap: true, email: true, role: true },
        take: perGroup,
        orderBy: { namaLengkap: 'asc' },
      });
      groups.users = {
        count: rows.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: rows.map((u: any) => ({
          id: u.id,
          type: 'users',
          title: u.namaLengkap,
          subtitle: `${u.role} • ${u.email}`,
        })),
      };
    }

    if (wanted('documents')) {
      const rows = await prisma.dokumen.findMany({
        where: {
          ...this.scopeHelper.buildIndirectScopeFilter(scope ?? {}, 'anggota'),
          nomorDokumen: { contains: q, mode: 'insensitive' },
        },
        select: {
          id: true,
          nomorDokumen: true,
          tipe: true,
          anggota: { select: { namaLengkap: true } },
        },
        take: perGroup,
        orderBy: { createdAt: 'desc' },
      });
      groups.documents = {
        count: rows.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: rows.map((d: any) => ({
          id: d.id,
          type: 'documents',
          title: d.nomorDokumen,
          subtitle: `${d.tipe} • ${d.anggota?.namaLengkap || '-'}`,
        })),
      };
    }

    const total = Object.values(groups).reduce((sum, g) => sum + g.count, 0);
    return { query: q, total, groups };
  }
}