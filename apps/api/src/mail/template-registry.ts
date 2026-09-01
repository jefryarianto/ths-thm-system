import {
  welcomeMemberEmail,
  approvedMemberEmail,
  registrationApprovedEmail,
  registrationRejectedEmail,
  candidateRejectedEmail,
  resetPasswordEmail,
  paymentConfirmationEmail,
  activityInvitationEmail,
  trainingNotificationEmail,
  attendanceConfirmationEmail,
  documentReadyEmail,
  claimStatusEmail,
  graduationResultEmail,
  graduationRegisteredEmail,
  generalNotificationEmail,
  examinerWelcomeEmail,
  examinerAssignmentEmail,
  dispositionNotificationEmail,
  userWelcomeEmail,
  badgeEarnedEmail,
  levelUpEmail,
  credentialEmail,
  dataIncompleteEmail,
  orgDocumentNotificationEmail,
  batchCompletionEmail,
  monitoringAlertEmail,
} from './email-templates';

export interface TemplateVariable {
  name: string;
  sample: string;
  description: string;
}

export interface TemplateDefinition {
  name: string;
  label: string;
  variables: TemplateVariable[];
  /** Render template default dengan nilai contoh; overrides mengganti nilai contoh. */
  renderDefault: (overrides?: Record<string, string>) => { subject: string; html: string };
}

/**
 * Registri template email — katalog variabel yang tersedia + render default
 * untuk pratinjau. Admin mengedit HTML lewat endpoint template; UI memakai
 * katalog ini untuk autocomplete variabel `{{...}}`.
 */
export const EMAIL_TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = {
  welcomeMemberEmail: {
    name: 'welcomeMemberEmail',
    label: 'Selamat Datang Anggota',
    variables: [{ name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap anggota' }],
    renderDefault: (o) => welcomeMemberEmail(o?.nama ?? 'Budi Santoso'),
  },
  approvedMemberEmail: {
    name: 'approvedMemberEmail',
    label: 'Anggota Disetujui',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap anggota' },
      { name: 'nomorAnggota', sample: 'T01-R01-001-2026', description: 'Nomor anggota resmi' },
    ],
    renderDefault: (o) =>
      approvedMemberEmail(o?.nama ?? 'Budi Santoso', o?.nomorAnggota ?? 'T01-R01-001-2026'),
  },
  registrationApprovedEmail: {
    name: 'registrationApprovedEmail',
    label: 'Pendaftaran Disetujui',
    variables: [{ name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap calon anggota' }],
    renderDefault: (o) => registrationApprovedEmail(o?.nama ?? 'Budi Santoso'),
  },
  registrationRejectedEmail: {
    name: 'registrationRejectedEmail',
    label: 'Pendaftaran Ditolak',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap calon anggota' },
      { name: 'reason', sample: 'Data tidak lengkap', description: 'Alasan penolakan' },
    ],
    renderDefault: (o) =>
      registrationRejectedEmail(o?.nama ?? 'Budi Santoso', o?.reason ?? 'Data tidak lengkap'),
  },
  candidateRejectedEmail: {
    name: 'candidateRejectedEmail',
    label: 'Calon Anggota Ditolak',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap calon anggota' },
      { name: 'reason', sample: 'Belum memenuhi syarat', description: 'Alasan penolakan' },
    ],
    renderDefault: (o) =>
      candidateRejectedEmail(o?.nama ?? 'Budi Santoso', o?.reason ?? 'Belum memenuhi syarat'),
  },
  resetPasswordEmail: {
    name: 'resetPasswordEmail',
    label: 'Reset Kata Sandi',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap pengguna' },
      { name: 'resetUrl', sample: 'https://app.ths-thm.org/reset-password?token=abc123', description: 'Tautan reset kata sandi' },
    ],
    renderDefault: (o) =>
      resetPasswordEmail(
        o?.nama ?? 'Budi Santoso',
        o?.resetUrl ?? 'https://app.ths-thm.org/reset-password?token=abc123',
      ),
  },
  paymentConfirmationEmail: {
    name: 'paymentConfirmationEmail',
    label: 'Konfirmasi Pembayaran Iuran',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap anggota' },
      { name: 'jumlah', sample: 'Rp 50.000', description: 'Jumlah iuran (sudah terformat)' },
      { name: 'periode', sample: 'Januari 2026', description: 'Periode iuran' },
    ],
    renderDefault: (o) =>
      paymentConfirmationEmail(o?.nama ?? 'Budi Santoso', 50000, o?.periode ?? 'Januari 2026', true),
  },
  activityInvitationEmail: {
    name: 'activityInvitationEmail',
    label: 'Undangan Kegiatan',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap peserta' },
      { name: 'activityName', sample: 'Pendadaran Gelombang 1', description: 'Nama kegiatan' },
      { name: 'tanggal', sample: 'Sabtu, 15 Agustus 2026', description: 'Tanggal kegiatan' },
      { name: 'lokasi', sample: 'Aula THS-THM Kupang', description: 'Lokasi kegiatan' },
    ],
    renderDefault: (o) =>
      activityInvitationEmail(
        o?.nama ?? 'Budi Santoso',
        o?.activityName ?? 'Pendadaran Gelombang 1',
        o?.tanggal ?? 'Sabtu, 15 Agustus 2026',
        o?.lokasi ?? 'Aula THS-THM Kupang',
      ),
  },
  trainingNotificationEmail: {
    name: 'trainingNotificationEmail',
    label: 'Jadwal Latihan',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap anggota' },
      { name: 'jenisMateri', sample: 'Teknik Dasar Tangan', description: 'Materi latihan' },
      { name: 'hariTanggal', sample: 'Minggu, 17 Agustus 2026', description: 'Jadwal latihan' },
      { name: 'lokasi', sample: 'GOR Oepoi', description: 'Lokasi latihan' },
    ],
    renderDefault: (o) =>
      trainingNotificationEmail(
        o?.nama ?? 'Budi Santoso',
        o?.jenisMateri ?? 'Teknik Dasar Tangan',
        o?.hariTanggal ?? 'Minggu, 17 Agustus 2026',
        o?.lokasi ?? 'GOR Oepoi',
      ),
  },
  attendanceConfirmationEmail: {
    name: 'attendanceConfirmationEmail',
    label: 'Konfirmasi Kehadiran Latihan',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap anggota' },
      { name: 'jenisMateri', sample: 'Teknik Dasar Tangan', description: 'Materi latihan' },
      { name: 'hadir', sample: 'HADIR', description: 'Status kehadiran (HADIR/TIDAK HADIR)' },
    ],
    renderDefault: (o) =>
      attendanceConfirmationEmail(o?.nama ?? 'Budi Santoso', o?.jenisMateri ?? 'Teknik Dasar Tangan', true),
  },
  documentReadyEmail: {
    name: 'documentReadyEmail',
    label: 'Dokumen Siap',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap anggota' },
      { name: 'docType', sample: 'Sertifikat Pendadaran', description: 'Jenis dokumen' },
      { name: 'nomorDokumen', sample: 'SERT-2026-0001', description: 'Nomor dokumen' },
    ],
    renderDefault: (o) =>
      documentReadyEmail(
        o?.nama ?? 'Budi Santoso',
        o?.docType ?? 'sertifikat_pendadaran',
        o?.nomorDokumen ?? 'SERT-2026-0001',
      ),
  },
  claimStatusEmail: {
    name: 'claimStatusEmail',
    label: 'Status Klaim',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap anggota' },
      { name: 'status', sample: 'disetujui', description: 'Status klaim' },
      { name: 'reason', sample: 'Berkas lengkap', description: 'Alasan (opsional)' },
    ],
    renderDefault: (o) =>
      claimStatusEmail(o?.nama ?? 'Budi Santoso', o?.status ?? 'disetujui', o?.reason ?? 'Berkas lengkap'),
  },
  graduationResultEmail: {
    name: 'graduationResultEmail',
    label: 'Hasil Pendadaran',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap peserta' },
      { name: 'lulus', sample: 'LULUS', description: 'Status kelulusan' },
      { name: 'skor', sample: '85', description: 'Skor nilai (opsional)' },
    ],
    renderDefault: (o) =>
      graduationResultEmail(o?.nama ?? 'Budi Santoso', true, Number(o?.skor) || 85),
  },
  graduationRegisteredEmail: {
    name: 'graduationRegisteredEmail',
    label: 'Terdaftar Pendadaran',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap peserta' },
      { name: 'namaPendadaran', sample: 'Pendadaran Gelombang 1', description: 'Nama pendadaran' },
      { name: 'tanggal', sample: 'Sabtu, 15 Agustus 2026', description: 'Tanggal pendadaran' },
    ],
    renderDefault: (o) =>
      graduationRegisteredEmail(
        o?.nama ?? 'Budi Santoso',
        o?.namaPendadaran ?? 'Pendadaran Gelombang 1',
        o?.tanggal ?? 'Sabtu, 15 Agustus 2026',
      ),
  },
  generalNotificationEmail: {
    name: 'generalNotificationEmail',
    label: 'Notifikasi Umum',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap penerima' },
      { name: 'judul', sample: 'Pengumuman Penting', description: 'Judul notifikasi' },
      { name: 'isi', sample: 'Ini adalah isi notifikasi.', description: 'Isi notifikasi' },
    ],
    renderDefault: (o) =>
      generalNotificationEmail(
        o?.nama ?? 'Budi Santoso',
        o?.judul ?? 'Pengumuman Penting',
        o?.isi ?? 'Ini adalah isi notifikasi.',
      ),
  },
  examinerWelcomeEmail: {
    name: 'examinerWelcomeEmail',
    label: 'Selamat Datang Penguji',
    variables: [
      { name: 'nama', sample: 'Surya Wijaya', description: 'Nama lengkap penguji' },
      { name: 'email', sample: 'penguji@example.com', description: 'Email penguji' },
      { name: 'setPasswordUrl', sample: 'https://app.ths-thm.org/set-password?token=abc123', description: 'Tautan set password' },
    ],
    renderDefault: (o) =>
      examinerWelcomeEmail(
        o?.nama ?? 'Surya Wijaya',
        o?.email ?? 'penguji@example.com',
        o?.setPasswordUrl ?? 'https://app.ths-thm.org/set-password?token=abc123',
      ),
  },
  examinerAssignmentEmail: {
    name: 'examinerAssignmentEmail',
    label: 'Penugasan Penguji',
    variables: [
      { name: 'nama', sample: 'Surya Wijaya', description: 'Nama lengkap penguji' },
      { name: 'activityName', sample: 'Pendadaran Gelombang 1', description: 'Nama kegiatan' },
      { name: 'tanggal', sample: 'Sabtu, 15 Agustus 2026', description: 'Tanggal kegiatan' },
      { name: 'lokasi', sample: 'Aula THS-THM Kupang', description: 'Lokasi kegiatan' },
    ],
    renderDefault: (o) =>
      examinerAssignmentEmail(
        o?.nama ?? 'Surya Wijaya',
        o?.activityName ?? 'Pendadaran Gelombang 1',
        o?.tanggal ?? 'Sabtu, 15 Agustus 2026',
        o?.lokasi ?? 'Aula THS-THM Kupang',
      ),
  },
  dispositionNotificationEmail: {
    name: 'dispositionNotificationEmail',
    label: 'Notifikasi Disposisi Surat',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama penerima disposisi' },
      { name: 'pengirim', sample: 'Admin Distrik', description: 'Pengirim surat' },
      { name: 'perihal', sample: 'Undangan Rapat', description: 'Perihal surat' },
      { name: 'isi', sample: 'Mohon ditindaklanjuti.', description: 'Isi disposisi' },
    ],
    renderDefault: (o) =>
      dispositionNotificationEmail(
        o?.nama ?? 'Budi Santoso',
        o?.pengirim ?? 'Admin Distrik',
        o?.perihal ?? 'Undangan Rapat',
        o?.isi ?? 'Mohon ditindaklanjuti.',
      ),
  },
  userWelcomeEmail: {
    name: 'userWelcomeEmail',
    label: 'Akun Pengguna Dibuat',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap pengguna' },
      { name: 'email', sample: 'anggota@example.com', description: 'Email pengguna' },
      { name: 'role', sample: 'Admin Ranting', description: 'Peran pengguna' },
      { name: 'setPasswordUrl', sample: 'https://app.ths-thm.org/set-password?token=abc123', description: 'Tautan set password' },
    ],
    renderDefault: (o) =>
      userWelcomeEmail(
        o?.nama ?? 'Budi Santoso',
        o?.email ?? 'anggota@example.com',
        o?.role ?? 'admin_ranting',
        o?.setPasswordUrl ?? 'https://app.ths-thm.org/set-password?token=abc123',
      ),
  },
  badgeEarnedEmail: {
    name: 'badgeEarnedEmail',
    label: 'Lencana Diperoleh',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap anggota' },
      { name: 'badge', sample: 'Aktif Berlatih', description: 'Nama lencana' },
    ],
    renderDefault: (o) =>
      badgeEarnedEmail(o?.nama ?? 'Budi Santoso', o?.badge ?? 'Aktif Berlatih', '🏅', 'Lencana untuk latihan rutin.'),
  },
  levelUpEmail: {
    name: 'levelUpEmail',
    label: 'Naik Level',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap anggota' },
      { name: 'oldLevel', sample: 'Pemula', description: 'Level sebelumnya' },
      { name: 'newLevel', sample: 'Menengah', description: 'Level baru' },
      { name: 'points', sample: '1200', description: 'Total poin' },
    ],
    renderDefault: (o) =>
      levelUpEmail(
        o?.nama ?? 'Budi Santoso',
        o?.oldLevel ?? 'Pemula',
        o?.newLevel ?? 'Menengah',
        Number(o?.points) || 1200,
      ),
  },
  credentialEmail: {
    name: 'credentialEmail',
    label: 'Kredensial Login',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap anggota' },
      { name: 'username', sample: 'budi@example.com', description: 'Username / email login' },
      { name: 'password', sample: 'thsthm123456', description: 'Password default' },
    ],
    renderDefault: (o) =>
      credentialEmail(
        o?.nama ?? 'Budi Santoso',
        o?.username ?? 'budi@example.com',
        o?.password ?? 'thsthm123456',
      ),
  },
  dataIncompleteEmail: {
    name: 'dataIncompleteEmail',
    label: 'Data Belum Lengkap',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap anggota' },
      { name: 'missingFields', sample: 'alamat,no_hp', description: 'Daftar field yang kurang (pisah koma)' },
    ],
    renderDefault: (o) =>
      dataIncompleteEmail(
        o?.nama ?? 'Budi Santoso',
        (o?.missingFields ?? 'alamat,no_hp').split(','),
      ),
  },
  orgDocumentNotificationEmail: {
    name: 'orgDocumentNotificationEmail',
    label: 'Dokumen Organisasi Baru',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama admin penerima' },
      { name: 'judul', sample: 'SK Pendirian', description: 'Judul dokumen' },
    ],
    renderDefault: (o) =>
      orgDocumentNotificationEmail(o?.nama ?? 'Budi Santoso', o?.judul ?? 'SK Pendirian'),
  },
  batchCompletionEmail: {
    name: 'batchCompletionEmail',
    label: 'Batch Generate Selesai',
    variables: [
      { name: 'nama', sample: 'Budi Santoso', description: 'Nama lengkap pengguna' },
      { name: 'typeLabel', sample: 'Kartu Anggota', description: 'Jenis dokumen' },
      { name: 'success', sample: '50', description: 'Jumlah berhasil' },
      { name: 'failed', sample: '2', description: 'Jumlah gagal' },
    ],
    renderDefault: (o) =>
      batchCompletionEmail(
        o?.nama ?? 'Budi Santoso',
        o?.typeLabel ?? 'Kartu Anggota',
        Number(o?.success) || 50,
        Number(o?.failed) || 2,
      ),
  },
  monitoringAlertEmail: {
    name: 'monitoringAlertEmail',
    label: 'Monitoring Alert',
    variables: [
      { name: 'alertName', sample: 'CPU High Usage', description: 'Nama alert' },
      { name: 'message', sample: 'CPU usage > 90%', description: 'Pesan alert' },
    ],
    renderDefault: (o) =>
      monitoringAlertEmail(o?.alertName ?? 'CPU High Usage', o?.message ?? 'CPU usage > 90%'),
  },
};

export function getTemplateDefinition(name: string): TemplateDefinition | undefined {
  return EMAIL_TEMPLATE_REGISTRY[name];
}

/** Daftar semua definisi template (untuk UI admin). */
export function listTemplateDefinitions(): TemplateDefinition[] {
  return Object.values(EMAIL_TEMPLATE_REGISTRY);
}