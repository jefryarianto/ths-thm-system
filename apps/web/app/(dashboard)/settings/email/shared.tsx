'use client';

import { FileText, ChevronRight, Download } from 'lucide-react';
import { useState } from 'react';

// ─── Module Filter ───

export const MODULES = [
  { value: '', label: 'Semua Modul' },
  { value: 'members', label: 'Anggota' },
  { value: 'candidates', label: 'Calon' },
  { value: 'registrations', label: 'Registrasi' },
  { value: 'examiners', label: 'Penguji' },
  { value: 'users', label: 'User' },
  { value: 'activities', label: 'Kegiatan' },
  { value: 'claims', label: 'Klaim' },
  { value: 'auth', label: 'Auth' },
  { value: 'trainings', label: 'Latihan' },
  { value: 'dues', label: 'Iuran' },
  { value: 'letters', label: 'Surat' },
  { value: 'graduations', label: 'Pendadaran' },
  { value: 'documents', label: 'Dokumen' },
  { value: 'gamification', label: 'Gamifikasi' },
  { value: 'org-documents', label: 'Dok. Organisasi' },
];

// ─── Email Template Directory ───

export const EMAIL_TEMPLATES = [
  {
    category: '👥 Keanggotaan',
    items: [
      { name: 'welcomeMemberEmail', params: '(nama, email, password)', trigger: 'Anggota baru dibuat (manual/CSV)', label: 'Welcome Anggota' },
      { name: 'approvedMemberEmail', params: '(nama, email, password, nomorAnggota)', trigger: 'Calon anggota disetujui jadi anggota', label: 'Calon Disetujui' },
      { name: 'candidateRejectedEmail', params: '(nama, alasan)', trigger: 'Calon anggota ditolak', label: 'Calon Ditolak' },
      { name: 'registrationApprovedEmail', params: '(nama, email, password)', trigger: 'Pendaftaran disetujui', label: 'Registrasi Disetujui' },
      { name: 'registrationRejectedEmail', params: '(nama, alasan)', trigger: 'Pendaftaran ditolak', label: 'Registrasi Ditolak' },
    ],
  },
  {
    category: '📅 Kegiatan & Latihan',
    items: [
      { name: 'activityInvitationEmail', params: '(nama, kegiatanNama, tanggal, lokasi)', trigger: 'Peserta ditambahkan ke kegiatan', label: 'Undangan Kegiatan' },
      { name: 'trainingNotificationEmail', params: '(nama, materi, tanggal, waktu)', trigger: 'Jadwal latihan baru dibuat', label: 'Notif Latihan' },
      { name: 'attendanceConfirmationEmail', params: '(nama, materi, tanggal, statusHadir)', trigger: 'Absensi latihan dicatat', label: 'Konfirmasi Absensi' },
    ],
  },
  {
    category: '💰 Iuran & Pembayaran',
    items: [
      { name: 'paymentConfirmationEmail', params: '(nama, jumlah, bulan, tahun, status)', trigger: 'Iuran dibuat/status diupdate lunas', label: 'Konfirmasi Iuran' },
    ],
  },
  {
    category: '📄 Dokumen & Klaim',
    items: [
      { name: 'documentReadyEmail', params: '(nama, judulDokumen)', trigger: 'Dokumen selesai digenerate', label: 'Dokumen Siap' },
      { name: 'claimStatusEmail', params: '(nama, status, alasan?)', trigger: 'Status klaim berubah (approve/reject/process)', label: 'Status Klaim' },
    ],
  },
  {
    category: '🎓 Pendadaran',
    items: [
      { name: 'graduationRegisteredEmail', params: '(nama, namaPendadaran, tanggal)', trigger: 'Peserta daftar pendadaran', label: 'Daftar Pendadaran' },
      { name: 'graduationResultEmail', params: '(nama, lulus, skor?)', trigger: 'Hasil pendadaran (lulus/gagal)', label: 'Hasil Pendadaran' },
    ],
  },
  {
    category: '🧑‍🏫 Penguji & Admin',
    items: [
      { name: 'examinerWelcomeEmail', params: '(nama, email, password)', trigger: 'Penguji baru dibuat', label: 'Welcome Penguji' },
      { name: 'examinerAssignmentEmail', params: '(nama, kegiatanNama, tanggal, peran)', trigger: 'Penguji ditugaskan ke kegiatan', label: 'Penugasan Penguji' },
      { name: 'userWelcomeEmail', params: '(nama, email, role, password)', trigger: 'Admin baru dibuat', label: 'Welcome Admin' },
    ],
  },
  {
    category: '📨 Surat & Dokumen Organisasi',
    items: [
      { name: 'dispositionNotificationEmail', params: '(namaPenerima, pengirim, perihalSurat, isiDisposisi)', trigger: 'Disposisi surat masuk', label: 'Disposisi Surat' },
      { name: 'orgDocumentNotificationEmail', params: '(nama, judulDokumen, kategori)', trigger: 'Dokumen organisasi baru diupload', label: 'Upload Dokumen' },
    ],
  },
  {
    category: '🔐 Keamanan & Gamifikasi',
    items: [
      { name: 'resetPasswordEmail', params: '(nama, resetLink)', trigger: 'User minta reset password', label: 'Reset Password' },
      { name: 'generalNotificationEmail', params: '(nama, judul, isi)', trigger: 'Notifikasi manual dikirim via admin', label: 'Notifikasi Umum' },
      { name: 'badgeEarnedEmail', params: '(nama, badgeName, badgeIcon, description)', trigger: 'Anggota mendapat badge baru', label: 'Badge Baru' },
      { name: 'levelUpEmail', params: '(nama, oldLevel, newLevel, points)', trigger: 'Anggota naik level', label: 'Level Up' },
    ],
  },
];

// ─── Types ───

export interface MailStatus {
  mode: string;
  resend: { configured: boolean; hasApiKey: boolean; hasDomain: boolean };
  smtp: { configured: boolean; host: string | null; port: number | null; hasCredentials: boolean };
}

export interface EmailLogEntry {
  id: string;
  to: string;
  subject: string;
  status: string;
  provider: string | null;
  error: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface LogStats {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  successRate: number;
  dailyStats: Array<{ date: string; sent: number; failed: number; skipped: number }>;
  topRecipients: Array<{ email: string; count: number }>;
}

export interface UsedModule {
  module: string;
  label: string;
  count: number;
}

export interface Engagement {
  totalSent: number;
  totalEvents: number;
  events: Record<string, number>;
  rates: Record<string, number>;
  dailyTrend?: Array<{ date: string; sent: number; opened: number; clicked: number; bounced: number; openRate: number; clickRate: number; bounceRate: number }>;
}

export interface SuppressionEntry {
  id: string;
  email: string;
  reason: string;
  event: { event: string; timestamp: string } | null;
  createdAt: string;
}

export interface SuppressionMeta {
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

// ─── Helpers ───

export function statusBadge(status: string) {
  const styles: Record<string, string> = {
    sent: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
    failed: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
    skipped: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
  };
  const labels: Record<string, string> = { sent: 'Terkirim', failed: 'Gagal', skipped: 'Skip' };
  const icons: Record<string, string> = { sent: '✅', failed: '❌', skipped: '⏭️' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {icons[status] || ''} {labels[status] || status}
    </span>
  );
}

export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function EngagementCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

export function FilePreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [expanded, setExpanded] = useState(false);
  const isPdf = fileUrl.endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-left"
      >
        <FileText size={16} className="text-blue-600 flex-shrink-0" />
        <span className="text-sm text-gray-700 truncate flex-1">{fileName}</span>
        <ChevronRight size={14} className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="rounded-lg overflow-hidden border border-gray-200">
          {isPdf ? (
            <iframe src={fileUrl} className="w-full h-80" title={`Preview: ${fileName}`} />
          ) : isImage ? (
            <img src={fileUrl} alt={fileName} className="w-full h-auto max-h-80 object-contain bg-gray-50" />
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              <FileText size={32} className="mx-auto mb-2 text-gray-400" />
              <p>Preview tidak tersedia untuk file ini</p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                <Download size={12} /> Download
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
