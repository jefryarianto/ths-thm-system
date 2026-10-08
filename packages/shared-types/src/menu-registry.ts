import type { Role } from './index';

/**
 * REGISTRY MENU BERSAMA — single source of truth untuk `menuKey` menu sidebar.
 *
 * Sumber data: `menuGroups` di apps/web/src/components/layout/navigation.ts.
 * Jangan menambah/mengubah entry di sini tanpa menyesuaikan navigasi (atau
 * sebaliknya) — regresi dijaga oleh menu-registry.test.ts di apps/web.
 *
 * ## Kontrak
 * - `menuKey`  : kunci stabil camelCase yang disimpan di tabel
 *                 `RoleMenuPermission.menuKey`. TIDAK boleh berubah begitu
 *                 ada data — mengubahnya = memutus akses tersimpan.
 * - `label`    : teks yang ditampilkan (sidebar & matriks).
 * - `href`     : path menu, selalu sinkron dengan navigasi.
 * - `minRole`  : role minimum EFEKTIF — turunan dari tiga gerbang di
 *                 `filterVisibleGroups()`:
 *                   1. `item.minRole` navigasi
 *                   2. `item.adminOnly`  → setara admin_ranting
 *                   3. `MODULE_PERMISSIONS[moduleKey].view`
 *                 yaitu `max()` dari ketiganya, karena ketiganya diterapkan
 *                 sebagai AND. Memakai hierarki ROLE_LEVEL (bukan array
 *                 ROLE_HIERARCHY API — urutannya berbeda, lihat ROLE_LEVEL).
 *
 * Seed `isEnabled = ROLE_LEVEL[role] >= ROLE_LEVEL[minRole]` sehingga baris
 * awal tabel identik dengan visibilitas sidebar saat ini.
 */

/** Satu baris registry menu. */
export interface MenuItemDef {
  menuKey: string;
  label: string;
  href: string;
  minRole: Role;
}

/** Seluruh menu sidebar, dalam urutan navigasi. */
export const MENU_REGISTRY = [
  { menuKey: 'dashboard', label: 'Dashboard', href: '/dashboard', minRole: 'penguji' },
  { menuKey: 'activities', label: 'Kegiatan', href: '/activities', minRole: 'anggota' },
  { menuKey: 'calendar', label: 'Kalender', href: '/calendar', minRole: 'anggota' },
  { menuKey: 'forum', label: 'Forum', href: '/forum', minRole: 'anggota' },
  { menuKey: 'notifications', label: 'Notifikasi', href: '/notifications', minRole: 'anggota' },
  { menuKey: 'orgChart', label: 'Peta Organisasi', href: '/org-chart', minRole: 'anggota' },
  { menuKey: 'documents', label: 'Dokumen', href: '/documents', minRole: 'anggota' },
  { menuKey: 'dues', label: 'Iuran', href: '/dues', minRole: 'anggota' },
  { menuKey: 'contentBerita', label: 'Berita', href: '/content/berita', minRole: 'admin_wilayah' },
  { menuKey: 'reports', label: 'Laporan Umum', href: '/reports', minRole: 'admin_ranting' },
  { menuKey: 'members', label: 'Anggota', href: '/members', minRole: 'admin_ranting' },
  { menuKey: 'membersMutasi', label: 'Mutasi', href: '/members/mutasi', minRole: 'admin_ranting' },
  { menuKey: 'candidates', label: 'Calon', href: '/candidates', minRole: 'admin_kegiatan' },
  { menuKey: 'registrations', label: 'Pendaftaran', href: '/registrations', minRole: 'admin_ranting' },
  { menuKey: 'claims', label: 'Klaim', href: '/claims', minRole: 'admin_ranting' },
  { menuKey: 'letters', label: 'Surat', href: '/letters', minRole: 'admin_ranting' },
  { menuKey: 'trainings', label: 'Latihan', href: '/trainings', minRole: 'admin_ranting' },
  { menuKey: 'graduations', label: 'Pendadaran', href: '/graduations', minRole: 'admin_kegiatan' },
  { menuKey: 'examiners', label: 'Penguji', href: '/examiners', minRole: 'admin_kegiatan' },
  { menuKey: 'assessments', label: 'Penilaian', href: '/assessments', minRole: 'penguji' },
  { menuKey: 'approvals', label: 'Persetujuan', href: '/approvals', minRole: 'admin_ranting' },
  { menuKey: 'orgDocuments', label: 'Dokumen Organisasi', href: '/org-documents', minRole: 'anggota' },
  { menuKey: 'settingsJabatan', label: 'Jabatan', href: '/settings/jabatan', minRole: 'admin_distrik' },
  { menuKey: 'settingsPeriode', label: 'Periode', href: '/settings/periode', minRole: 'superadmin' },
  { menuKey: 'settingsKepengurusan', label: 'Kepengurusan', href: '/settings/kepengurusan', minRole: 'admin_wilayah' },
  { menuKey: 'settingsOrgChartEditor', label: 'Editor Org Chart', href: '/settings/org-chart-editor', minRole: 'admin_wilayah' },
  { menuKey: 'payments', label: 'Pembayaran', href: '/payments', minRole: 'admin_ranting' },
  { menuKey: 'users', label: 'Pengguna', href: '/users', minRole: 'admin_ranting' },
  { menuKey: 'monitoring', label: 'Monitoring', href: '/monitoring', minRole: 'superadmin' },
  { menuKey: 'monitoringAlerts', label: 'Alert Thresholds', href: '/monitoring/alerts', minRole: 'superadmin' },
  { menuKey: 'monitoringIncidents', label: 'Incidents', href: '/monitoring/incidents', minRole: 'superadmin' },
  { menuKey: 'wsMonitor', label: 'WebSocket', href: '/ws-monitor', minRole: 'superadmin' },
  { menuKey: 'adminQueues', label: 'Antrean', href: '/admin/queues', minRole: 'superadmin' },
  { menuKey: 'settings', label: 'Pengaturan', href: '/settings', minRole: 'admin_ranting' },
  { menuKey: 'settingsMenuPermissions', label: 'Hak Akses Menu', href: '/settings/menu-permissions', minRole: 'superadmin' },
  { menuKey: 'settingsEmail', label: 'Email Admin', href: '/settings/email', minRole: 'admin_distrik' },
  { menuKey: 'settingsPenandatangan', label: 'Penandatangan', href: '/settings/penandatangan', minRole: 'admin_distrik' },
  { menuKey: 'settingsKartu', label: 'Template Kartu', href: '/settings/kartu', minRole: 'admin_distrik' },
  { menuKey: 'settingsDokumen', label: 'Template Dokumen', href: '/settings/dokumen', minRole: 'superadmin' },
  { menuKey: 'settingsFcmTest', label: 'Pengujian FCM', href: '/settings/fcm-test', minRole: 'superadmin' },
  { menuKey: 'settingsSessions', label: 'Manajemen Sesi', href: '/settings/sessions', minRole: 'superadmin' },
  { menuKey: 'settingsBackup', label: 'Database Backup', href: '/settings/backup', minRole: 'superadmin' },
  { menuKey: 'gamification', label: 'Dasbor Gamifikasi', href: '/gamification', minRole: 'admin_ranting' },
  { menuKey: 'gamificationAdmin', label: 'Admin', href: '/gamification/admin', minRole: 'admin_ranting' },
  { menuKey: 'gamificationScoreboard', label: 'Scoreboard', href: '/gamification/scoreboard', minRole: 'admin_kegiatan' },
  { menuKey: 'gamificationReport', label: 'Laporan Gamifikasi', href: '/gamification/report', minRole: 'admin_ranting' },
  { menuKey: 'scanStats', label: 'Statistik Scan', href: '/scan-stats', minRole: 'admin_ranting' },
  { menuKey: 'contentSejarah', label: 'Sejarah', href: '/content/sejarah', minRole: 'superadmin' },
  { menuKey: 'contentOrganisasi', label: 'Konten Web Organisasi', href: '/content/organisasi', minRole: 'superadmin' },
] as const satisfies readonly MenuItemDef[];

/** Tipe union seluruh menuKey yang sah. */
export type MenuKey = (typeof MENU_REGISTRY)[number]['menuKey'];

/** Seluruh menuKey dalam urutan navigasi. */
export const MENU_KEYS: readonly MenuKey[] = MENU_REGISTRY.map((m) => m.menuKey);

/** Lookup cepat menuKey → definisi menu. */
export const MENU_BY_KEY: Readonly<Record<string, MenuItemDef>> = Object.freeze(
  Object.fromEntries(MENU_REGISTRY.map((m) => [m.menuKey, m])),
);

/**
 * Turunkan menuKey dari sebuah href — dipakai test regresi untuk memastikan
 * setiap item navigasi punya entry registry dengan kunci yang benar.
 * Aturan: buang leading '/', '#' dianggap pemisah segment, sisanya camelCase.
 */
export function menuKeyForHref(href: string): string {
  return href
    .replace(/^\//, '')
    .replace('#', '/')
    .split('/')
    .filter(Boolean)
    .map((seg, i) =>
      seg
        .split(/[-_]/)
        .map((w, j) => (i > 0 || j > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
        .join(''),
    )
    .join('');
}

/**
 * Label ramah-tampilan untuk sebuah menuKey.
 * Key yang tidak dikenal (baris lama di DB, atau menu baru yang belum masuk
 * registry) diteruskan apa adanya agar tetap terlihat di matriks.
 */
export function getMenuLabel(menuKey: string): string {
  return MENU_BY_KEY[menuKey]?.label ?? menuKey;
}
