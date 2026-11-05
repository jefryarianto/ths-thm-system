export const KTA_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Diajukan',
  RANTING_REVIEW: 'Review Ranting',
  WILAYAH_REVIEW: 'Review Wilayah',
  DISTRIK_REVIEW: 'Review Distrik',
  NASIONAL_REVIEW: 'Review Nasional',
  APPROVED: 'Disetujui Nasional',
  PAYMENT_SETUP: 'Biaya Diatur',
  PAYMENT_PENDING: 'Menunggu Pembayaran',
  PAYMENT_VERIFIED: 'Pembayaran Diverifikasi',
  CARD_GENERATING: 'Generate Kartu',
  CARD_GENERATED: 'Kartu Siap',
  REJECTED: 'Ditolak',
  CANCELLED: 'Dibatalkan',
};

export const KTA_STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300',
  RANTING_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  WILAYAH_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  DISTRIK_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  NASIONAL_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  PAYMENT_SETUP: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  PAYMENT_PENDING: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  PAYMENT_VERIFIED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  CARD_GENERATING: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  CARD_GENERATED: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export const KTA_LEVEL_LABELS: Record<string, string> = {
  RANTING: 'Ranting',
  WILAYAH: 'Wilayah',
  DISTRIK: 'Distrik',
  NASIONAL: 'Nasional',
  MEMBER: 'Anggota',
};

export const KTA_ACTION_LABELS: Record<string, string> = {
  SUBMITTED: 'Diajukan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  FORWARDED: 'Diteruskan',
  SKIPPED: 'Di-skip',
  PAYMENT_SETUP: 'Biaya Diatur',
  PAYMENT_VERIFIED: 'Pembayaran Diverifikasi',
  CARD_GENERATED: 'Kartu Digenerate',
  CANCELLED: 'Dibatalkan',
  SUPERADMIN_BYPASS: 'SuperAdmin Bypass',
};

export const KTA_STATUS_ORDER = [
  'SUBMITTED',
  'RANTING_REVIEW',
  'WILAYAH_REVIEW',
  'DISTRIK_REVIEW',
  'NASIONAL_REVIEW',
  'APPROVED',
  'PAYMENT_SETUP',
  'PAYMENT_PENDING',
  'PAYMENT_VERIFIED',
  'CARD_GENERATING',
  'CARD_GENERATED',
  'REJECTED',
  'CANCELLED',
];

export const KTA_PROCESSING_STATUSES = [
  'APPROVED',
  'PAYMENT_SETUP',
  'PAYMENT_PENDING',
  'PAYMENT_VERIFIED',
  'CARD_GENERATING',
  'CARD_GENERATED',
];

export function getKtaStatusLabel(status: string): string {
  return KTA_STATUS_LABELS[status] || status;
}

export function getKtaStatusColor(status: string): string {
  return KTA_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
}

export function getKtaLevelLabel(level: string): string {
  return KTA_LEVEL_LABELS[level] || level;
}

export function getKtaActionLabel(action: string): string {
  return KTA_ACTION_LABELS[action] || action;
}
