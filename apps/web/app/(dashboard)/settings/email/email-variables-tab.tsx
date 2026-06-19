'use client';

import { Info, FileText, Code } from 'lucide-react';

interface VariableInfo {
  name: string;
  description: string;
}

interface TemplateDoc {
  name: string;
  label: string;
  category: string;
  variables: VariableInfo[];
}

const TEMPLATE_DOCS: TemplateDoc[] = [
  {
    name: 'welcomeMemberEmail',
    label: 'Welcome Anggota',
    category: 'Keanggotaan',
    variables: [
      { name: 'nama', description: 'Nama lengkap anggota' },
    ],
  },
  {
    name: 'approvedMemberEmail',
    label: 'Calon Disetujui',
    category: 'Keanggotaan',
    variables: [
      { name: 'nama', description: 'Nama lengkap anggota' },
      { name: 'nomorAnggota', description: 'Nomor Registrasi Anggota (NRA)' },
    ],
  },
  {
    name: 'candidateRejectedEmail',
    label: 'Calon Ditolak',
    category: 'Keanggotaan',
    variables: [
      { name: 'nama', description: 'Nama lengkap calon anggota' },
      { name: 'alasan', description: 'Alasan penolakan' },
    ],
  },
  {
    name: 'registrationApprovedEmail',
    label: 'Registrasi Disetujui',
    category: 'Keanggotaan',
    variables: [
      { name: 'nama', description: 'Nama lengkap pendaftar' },
    ],
  },
  {
    name: 'registrationRejectedEmail',
    label: 'Registrasi Ditolak',
    category: 'Keanggotaan',
    variables: [
      { name: 'nama', description: 'Nama lengkap pendaftar' },
      { name: 'alasan', description: 'Alasan penolakan' },
    ],
  },
  {
    name: 'activityInvitationEmail',
    label: 'Undangan Kegiatan',
    category: 'Kegiatan & Latihan',
    variables: [
      { name: 'nama', description: 'Nama lengkap peserta' },
      { name: 'kegiatanNama', description: 'Nama kegiatan' },
      { name: 'tanggal', description: 'Tanggal pelaksanaan' },
      { name: 'lokasi', description: 'Lokasi kegiatan' },
    ],
  },
  {
    name: 'trainingNotificationEmail',
    label: 'Notif Latihan',
    category: 'Kegiatan & Latihan',
    variables: [
      { name: 'nama', description: 'Nama lengkap anggota' },
      { name: 'jenisMateri', description: 'Jenis/materi latihan' },
      { name: 'hariTanggal', description: 'Hari dan tanggal latihan' },
      { name: 'lokasi', description: 'Lokasi latihan' },
    ],
  },
  {
    name: 'attendanceConfirmationEmail',
    label: 'Konfirmasi Absensi',
    category: 'Kegiatan & Latihan',
    variables: [
      { name: 'nama', description: 'Nama lengkap anggota' },
      { name: 'jenisMateri', description: 'Jenis/materi latihan' },
      { name: 'hadir', description: 'Status kehadiran ("Hadir" / "Tidak Hadir")' },
    ],
  },
  {
    name: 'paymentConfirmationEmail',
    label: 'Konfirmasi Iuran',
    category: 'Iuran & Pembayaran',
    variables: [
      { name: 'nama', description: 'Nama lengkap anggota' },
      { name: 'jumlah', description: 'Jumlah pembayaran (angka)' },
      { name: 'periode', description: 'Periode iuran' },
    ],
  },
  {
    name: 'documentReadyEmail',
    label: 'Dokumen Siap',
    category: 'Dokumen & Klaim',
    variables: [
      { name: 'nama', description: 'Nama lengkap anggota' },
      { name: 'docType', description: 'Tipe dokumen' },
      { name: 'nomorDokumen', description: 'Nomor dokumen' },
    ],
  },
  {
    name: 'claimStatusEmail',
    label: 'Status Klaim',
    category: 'Dokumen & Klaim',
    variables: [
      { name: 'nama', description: 'Nama lengkap anggota' },
      { name: 'status', description: 'Status klaim (disetujui/ditolak/diproses)' },
      { name: 'alasan', description: 'Alasan (jika ditolak)' },
    ],
  },
  {
    name: 'graduationRegisteredEmail',
    label: 'Daftar Pendadaran',
    category: 'Pendadaran',
    variables: [
      { name: 'nama', description: 'Nama lengkap peserta' },
      { name: 'namaPendadaran', description: 'Nama acara pendadaran' },
      { name: 'tanggal', description: 'Tanggal pendadaran' },
    ],
  },
  {
    name: 'graduationResultEmail',
    label: 'Hasil Pendadaran',
    category: 'Pendadaran',
    variables: [
      { name: 'nama', description: 'Nama lengkap peserta' },
      { name: 'lulus', description: 'Status kelulusan ("Lulus" / "Gagal")' },
      { name: 'skor', description: 'Total skor (angka)' },
    ],
  },
  {
    name: 'examinerWelcomeEmail',
    label: 'Welcome Penguji',
    category: 'Penguji & Admin',
    variables: [
      { name: 'nama', description: 'Nama lengkap penguji' },
      { name: 'email', description: 'Email penguji' },
      { name: 'setPasswordUrl', description: 'URL untuk membuat password' },
    ],
  },
  {
    name: 'examinerAssignmentEmail',
    label: 'Penugasan Penguji',
    category: 'Penguji & Admin',
    variables: [
      { name: 'nama', description: 'Nama lengkap penguji' },
      { name: 'kegiatanNama', description: 'Nama kegiatan' },
      { name: 'tanggal', description: 'Tanggal kegiatan' },
      { name: 'peran', description: 'Peran penguji' },
    ],
  },
  {
    name: 'userWelcomeEmail',
    label: 'Welcome Admin',
    category: 'Penguji & Admin',
    variables: [
      { name: 'nama', description: 'Nama lengkap user' },
      { name: 'email', description: 'Email user' },
      { name: 'role', description: 'Role user' },
      { name: 'setPasswordUrl', description: 'URL untuk membuat password' },
    ],
  },
  {
    name: 'dispositionNotificationEmail',
    label: 'Disposisi Surat',
    category: 'Surat & Dokumen',
    variables: [
      { name: 'namaPenerima', description: 'Nama penerima disposisi' },
      { name: 'pengirim', description: 'Nama pengirim disposisi' },
      { name: 'perihalSurat', description: 'Perihal surat' },
      { name: 'isiDisposisi', description: 'Isi disposisi' },
    ],
  },
  {
    name: 'orgDocumentNotificationEmail',
    label: 'Upload Dokumen',
    category: 'Surat & Dokumen',
    variables: [
      { name: 'nama', description: 'Nama lengkap penerima' },
      { name: 'judul', description: 'Judul dokumen' },
      { name: 'kategori', description: 'Kategori dokumen' },
    ],
  },
  {
    name: 'resetPasswordEmail',
    label: 'Reset Password',
    category: 'Keamanan',
    variables: [
      { name: 'nama', description: 'Nama lengkap user' },
      { name: 'resetUrl', description: 'URL untuk reset password' },
    ],
  },
  {
    name: 'generalNotificationEmail',
    label: 'Notifikasi Umum',
    category: 'Keamanan & Gamifikasi',
    variables: [
      { name: 'nama', description: 'Nama lengkap penerima' },
      { name: 'judul', description: 'Judul notifikasi' },
      { name: 'isi', description: 'Isi notifikasi' },
    ],
  },
  {
    name: 'badgeEarnedEmail',
    label: 'Badge Baru',
    category: 'Keamanan & Gamifikasi',
    variables: [
      { name: 'nama', description: 'Nama lengkap anggota' },
      { name: 'badgeName', description: 'Nama badge' },
      { name: 'badgeIcon', description: 'Emoji icon badge' },
      { name: 'description', description: 'Deskripsi badge' },
    ],
  },
  {
    name: 'levelUpEmail',
    label: 'Level Up',
    category: 'Keamanan & Gamifikasi',
    variables: [
      { name: 'nama', description: 'Nama lengkap anggota' },
      { name: 'oldLevel', description: 'Level sebelumnya' },
      { name: 'newLevel', description: 'Level baru' },
      { name: 'points', description: 'Total poin (angka)' },
    ],
  },
];

export default function EmailVariablesTab() {
  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
        <h3 className="text-sm font-medium text-indigo-700 dark:text-indigo-400 flex items-center gap-2 mb-1">
          <Info size={16} />
          Panduan Variable Template Email
        </h3>
        <p className="text-xs text-indigo-600 dark:text-indigo-300">
          Gunakan {'{{variable}}'} di subject atau HTML body untuk menyisipkan data dinamis.
          Variable akan diganti secara otomatis saat email dikirim.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        {Object.entries(
          TEMPLATE_DOCS.reduce((acc, t) => {
            if (!acc[t.category]) acc[t.category] = [];
            acc[t.category].push(t);
            return acc;
          }, {} as Record<string, TemplateDoc[]>)
        ).map(([category, templates]) => (
          <div key={category} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-750">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {category}
              </h3>
            </div>
            {templates.map((tpl) => (
              <div
                key={tpl.name}
                className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-750/50 transition"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={14} className="text-blue-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {tpl.label}
                  </span>
                  <code className="text-[11px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400 font-mono">
                    {tpl.name}
                  </code>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {tpl.variables.map((v) => (
                    <div
                      key={v.name}
                      className="flex items-center gap-2 text-xs"
                    >
                      <code className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded font-mono whitespace-nowrap">
                        {'{{'}{v.name}{'}}'}
                      </code>
                      <span className="text-gray-500 dark:text-gray-400">
                        {v.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Usage Examples */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <Code size={15} />
          Contoh Penggunaan
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Subject:</p>
            <code className="text-xs text-gray-800 dark:text-gray-200 font-mono break-all">
              Selamat Datang, {'{{nama}}'} — THS-THM
            </code>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              → <em>Selamat Datang, John Doe — THS-THM</em>
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">HTML Body:</p>
            <code className="text-xs text-gray-800 dark:text-gray-200 font-mono break-all">
              {'<h1>Halo, {{nama}}!</h1><p>NRA: {{nomorAnggota}}</p>'}
            </code>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              → <em>Halo, John Doe! NRA: THM-2026-0001</em>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
