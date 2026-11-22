export type ResetPhase =
  | 'stale'
  | 'kepengurusan'
  | 'user-blocker'
  | 'kegiatan-child'
  | 'kegiatan'
  | 'anggota'
  | 'iuran'
  | 'jabatan'
  | 'periode'
  | 'users';

export interface ResetDeleteStep {
  model: string;
  phase: ResetPhase;
}

const DELETE_PLAN: readonly ResetDeleteStep[] = [
  { model: 'iuranReminder', phase: 'stale' },
  { model: 'riskFlag', phase: 'stale' },
  { model: 'dokumenVersion', phase: 'stale' },
  { model: 'documentJob', phase: 'stale' },
  { model: 'kepengurusan', phase: 'kepengurusan' },
  { model: 'calonAnggota', phase: 'user-blocker' },
  { model: 'latihan', phase: 'user-blocker' },
  { model: 'tandaTangan', phase: 'user-blocker' },
  { model: 'dokumenOrganisasi', phase: 'user-blocker' },
  { model: 'disposisi', phase: 'user-blocker' },
  { model: 'notifikasi', phase: 'user-blocker' },
  { model: 'deviceToken', phase: 'user-blocker' },
  { model: 'kegiatanPeserta', phase: 'kegiatan-child' },
  { model: 'presensiKegiatan', phase: 'kegiatan-child' },
  { model: 'checkIn', phase: 'kegiatan-child' },
  { model: 'dokumenKegiatan', phase: 'kegiatan-child' },
  { model: 'aspekPenilaian', phase: 'kegiatan-child' },
  { model: 'penugasanPenguji', phase: 'kegiatan-child' },
  { model: 'nilaiPendadaran', phase: 'kegiatan-child' },
  { model: 'hasilPendadaran', phase: 'kegiatan-child' },
  { model: 'ujianPraktek', phase: 'kegiatan-child' },
  { model: 'pesertaPendadaran', phase: 'kegiatan-child' },
  { model: 'undanganPendadaran', phase: 'kegiatan-child' },
  { model: 'kegiatan', phase: 'kegiatan' },
  { model: 'anggota', phase: 'anggota' },
  { model: 'iuran', phase: 'iuran' },
  { model: 'jabatan', phase: 'jabatan' },
  { model: 'periode', phase: 'periode' },
  { model: 'user', phase: 'users' },
];

export function getSelectiveResetDeletePlan(): ResetDeleteStep[] {
  return DELETE_PLAN.map((step) => ({ ...step }));
}
