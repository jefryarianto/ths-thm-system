/**
 * Breadcrumb path-to-label configuration.
 * Map URL path segments to human-readable breadcrumb labels.
 *
 * The lookup order is:
 *   1. Exact path match (e.g. '/members/new')
 *   2. Segment-by-segment label mapping
 *   3. Fallback: capitalize the segment
 */

/** Segment-level labels — maps a single path segment to its breadcrumb label */
export const SEGMENT_LABELS: Record<string, string> = {
  // Utama
  '': 'Dashboard',
  members: 'Anggota',
  candidates: 'Calon Anggota',
  registrations: 'Pendaftaran',
  claims: 'Klaim',

  // Pelatihan & Penilaian
  trainings: 'Latihan',
  graduations: 'Pendadaran',
  examiners: 'Penguji',
  assessments: 'Penilaian',
  items: 'Item Penilaian',
  aspects: 'Aspek Penilaian',

  // Aktivitas
  activities: 'Kegiatan',
  calendar: 'Kalender',
  approvals: 'Persetujuan',

  // Organisasi
  'org-chart': 'Peta Organisasi',
  'org-documents': 'Dokumen Organisasi',

  // Dokumen & Surat
  documents: 'Dokumen',
  letters: 'Surat',
  incoming: 'Surat Masuk',
  outgoing: 'Surat Keluar',

  // Keuangan
  dues: 'Iuran',
  payments: 'Pembayaran',

  // Gamifikasi
  gamification: 'Gamifikasi',
  scoreboard: 'Scoreboard',
  rewards: 'Penghargaan',
  manage: 'Kelola',
  admin: 'Admin',

  // Komunikasi
  forum: 'Forum',
  c: 'Kategori',
  t: 'Thread',
  notifications: 'Notifikasi',
  preferences: 'Preferensi',

  // Laporan
  reports: 'Laporan',
  'scan-stats': 'Statistik Scan',

  // Sistem
  users: 'Pengguna',
  settings: 'Pengaturan',
  email: 'Email',
  'org-structure': 'Struktur Organisasi',
  periods: 'Periode Iuran',
  'audit-logs': 'Audit Log',
  'ws-monitor': 'WebSocket',
  queues: 'Antrean Pekerjaan',
  'test-batch-progress': 'Batch Progress',

  // Action suffixes
  new: 'Tambah Baru',
  import: 'Import CSV',
  edit: 'Edit',
  incomplete: 'Data Tidak Lengkap',
  profile: 'Profil Saya',
  report: 'Laporan',
};

/** Array of breadcrumb segment arrays — defines the full path label for list pages */
export interface BreadcrumbSegment {
  href: string;
  label: string;
}

/**
 * Build breadcrumb segments from a URL pathname.
 * e.g. '/members/new' → [{ href: '/members', label: 'Anggota' }, { href: '/members/new', label: 'Tambah Baru' }]
 */
export function buildBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  if (!pathname || pathname === '/') {
    return [{ href: '/', label: 'Dashboard' }];
  }

  const segments = pathname.replace(/^\//, '').split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbSegment[] = [{ href: '/', label: 'Dashboard' }];

  // Skip dynamic segments like [id], [categoryId], [threadId], [anggotaId]
  const isDynamicSegment = (seg: string) => /^\[.+\]$/.test(seg);

  // Skip numeric-only segments (actual IDs at runtime)
  const isIdSegment = (seg: string) => /^\d+$/.test(seg) || /^[a-f0-9-]{20,}$/i.test(seg);

  let currentHref = '';

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    currentHref += '/' + seg;

    // Skip dynamic/ID segments for breadcrumb display
    if (isDynamicSegment(seg) || isIdSegment(seg)) {
      breadcrumbs.push({
        href: currentHref,
        label: 'Detail',
      });
      continue;
    }

    // Look up the label from config
    const label = SEGMENT_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
    breadcrumbs.push({ href: currentHref, label });
  }

  return breadcrumbs;
}
