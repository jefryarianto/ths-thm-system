// ─── Shared Email Templates for THS-THM System ───
// All email HTML templates centralized here for consistency and easy maintenance.
// Each function returns { subject, html } to be passed directly to MailService.sendMail().

const FOOTER = `
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
  <p style="color: #6b7280; font-size: 12px;">
    THS-THM System &mdash; Taman Harapan Siswa / Taman Harapan Murid
  </p>
`;

function wrap(bodyHtml: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${bodyHtml}
      ${FOOTER}
    </div>
  `;
}

// ─── Keanggotaan / Member ───

export function welcomeMemberEmail(nama: string) {
  return {
    subject: 'Selamat Datang di THS-THM!',
    html: wrap(`
      <h1 style="color: #1a56db;">Selamat Datang, ${nama}!</h1>
      <p>Terima kasih telah bergabung dengan <strong>THS-THM</strong>.</p>
      <p>Data keanggotaan Anda telah berhasil didaftarkan dalam sistem. Berikut adalah beberapa hal yang bisa Anda lakukan:</p>
      <ul style="line-height: 1.8; color: #374151;">
        <li>Melengkapi data profil keanggotaan</li>
        <li>Mengikuti kegiatan dan latihan</li>
        <li>Mendapatkan akses ke berbagai dokumen organisasi</li>
      </ul>
    `),
  };
}

export function approvedMemberEmail(nama: string, nomorAnggota: string) {
  return {
    subject: 'Selamat! Anda Telah Menjadi Anggota THS-THM',
    html: wrap(`
      <h1 style="color: #1a56db;">Selamat, ${nama}!</h1>
      <p>Anda telah resmi menjadi anggota <strong>THS-THM</strong>.</p>
      <p>Nomor Anggota Anda: <strong style="font-size: 18px; color: #1a56db;">${nomorAnggota}</strong></p>
      <p>Berikut adalah beberapa hal yang bisa Anda lakukan sebagai anggota:</p>
      <ul style="line-height: 1.8; color: #374151;">
        <li>Login ke aplikasi untuk melihat data keanggotaan</li>
        <li>Mengikuti kegiatan dan latihan rutin</li>
        <li>Mendapatkan kartu anggota digital</li>
        <li>Mengakses dokumen organisasi</li>
      </ul>
    `),
  };
}

export function rejectedMemberEmail(nama: string, reason?: string, context: 'pendaftaran' | 'calon_anggota' = 'pendaftaran') {
  const messages: Record<string, string> = {
    pendaftaran: 'Pendaftaran Anda di <strong>THS-THM</strong> <strong>tidak dapat diproses</strong>.',
    calon_anggota: 'Pengajuan calon anggota Anda di <strong>THS-THM</strong> <strong>tidak dapat dilanjutkan</strong>.',
  };

  const nextSteps: Record<string, string> = {
    pendaftaran: 'Silakan hubungi admin untuk informasi lebih lanjut atau mengajukan pendaftaran ulang.',
    calon_anggota: 'Silakan hubungi admin untuk informasi lebih lanjut.',
  };

  return {
    subject: 'Pemberitahuan — THS-THM',
    html: wrap(`
      <h1 style="color: #dc2626;">Pemberitahuan</h1>
      <p>Halo <strong>${nama}</strong>,</p>
      <p>${messages[context]}</p>
      ${reason ? `<p>Alasan: <em>${reason}</em></p>` : ''}
      <p>${nextSteps[context]}</p>
    `),
  };
}

// ─── Pendaftaran / Registration ───

export function registrationApprovedEmail(nama: string) {
  return {
    subject: 'Pendaftaran Anda Disetujui — THS-THM',
    html: wrap(`
      <h1 style="color: #1a56db;">Selamat, ${nama}!</h1>
      <p>Pendaftaran Anda di <strong>THS-THM</strong> telah <strong>disetujui</strong>.</p>
      <p>Anda sekarang terdaftar sebagai calon anggota. Silakan menunggu proses selanjutnya untuk menjadi anggota resmi.</p>
      <p>Jika ada pertanyaan, silakan hubungi admin ranting terdekat.</p>
    `),
  };
}

export function registrationRejectedEmail(nama: string, reason?: string) {
  return rejectedMemberEmail(nama, reason, 'pendaftaran');
}

export function candidateRejectedEmail(nama: string, reason?: string) {
  return rejectedMemberEmail(nama, reason, 'calon_anggota');
}

// ─── Reset Password ───

export function resetPasswordEmail(nama: string, resetUrl: string) {
  return {
    subject: 'Reset Password — THS-THM System',
    html: wrap(`
      <h1 style="color: #1a56db;">Reset Password</h1>
      <p>Halo <strong>${nama}</strong>,</p>
      <p>Kami menerima permintaan reset password untuk akun Anda.</p>
      <p>Klik tombol di bawah ini untuk mereset password Anda. Link ini berlaku selama <strong>1 jam</strong>.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p>Atau copy link berikut ke browser:</p>
      <p style="color: #6b7280; font-size: 14px;">${resetUrl}</p>
      <p style="color: #6b7280; font-size: 12px;">
        Jika Anda tidak meminta reset password, abaikan email ini.
      </p>
    `),
  };
}

// ─── Iuran / Dues ───

export function paymentConfirmationEmail(nama: string, jumlah?: number, periode?: string, isPaid: boolean = true) {
  const jumlahStr = jumlah ? `Rp ${Number(jumlah).toLocaleString('id-ID')}` : '';
  const periodeStr = periode || '';

  return {
    subject: isPaid ? 'Konfirmasi Pembayaran Iuran — THS-THM' : 'Informasi Iuran — THS-THM',
    html: wrap(`
      <h2 style="color: ${isPaid ? '#16a34a' : '#ca8a04'};">
        ${isPaid ? '✅ Pembayaran Iuran Diterima' : '📋 Informasi Iuran'}
      </h2>
      <p>Halo <strong>${nama}</strong>,</p>
      ${isPaid
        ? `<p>Pembayaran iuran Anda${periodeStr ? ` untuk periode <strong>${periodeStr}</strong>` : ''}${jumlahStr ? ` sebesar <strong>${jumlahStr}</strong>` : ''} telah <strong>diterima</strong>.</p>`
        : `<p>Iuran${periodeStr ? ` untuk periode <strong>${periodeStr}</strong>` : ''}${jumlahStr ? ` sebesar <strong>${jumlahStr}</strong>` : ''} sedang diproses.</p>`
      }
      <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
        THS-THM System &mdash; Notifikasi iuran otomatis
      </p>
    `),
  };
}

// ─── Kegiatan / Activity ───

export function activityInvitationEmail(nama: string, activityName: string, tanggal: string, lokasi: string) {
  return {
    subject: `Undangan Kegiatan — ${activityName}`,
    html: wrap(`
      <h2 style="color: #1a56db;">📅 Undangan Kegiatan</h2>
      <p>Halo <strong>${nama}</strong>,</p>
      <p>Anda telah didaftarkan sebagai peserta kegiatan:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; font-weight: bold; width: 100px;">Kegiatan</td><td style="padding: 8px;">${activityName}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Tanggal</td><td style="padding: 8px;">${tanggal}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Lokasi</td><td style="padding: 8px;">${lokasi}</td></tr>
      </table>
      <p>Mohon hadir tepat waktu dan persiapkan diri Anda.</p>
    `),
  };
}

// ─── Latihan / Training ───

export function trainingNotificationEmail(nama: string, jenisMateri: string, hariTanggal: string, lokasi: string) {
  return {
    subject: `Jadwal Latihan — ${jenisMateri}`,
    html: wrap(`
      <h2 style="color: #1a56db;">🏋️ Jadwal Latihan</h2>
      <p>Halo <strong>${nama}</strong>,</p>
      <p>Latihan rutin telah dijadwalkan:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; font-weight: bold; width: 100px;">Materi</td><td style="padding: 8px;">${jenisMateri}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Tanggal</td><td style="padding: 8px;">${hariTanggal}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Lokasi</td><td style="padding: 8px;">${lokasi}</td></tr>
      </table>
      <p>Hadir dan bawa perlengkapan latihan Anda.</p>
    `),
  };
}

export function attendanceConfirmationEmail(nama: string, jenisMateri: string, hadir: boolean) {
  return {
    subject: hadir ? 'Konfirmasi Kehadiran Latihan' : 'Ketidakhadiran Latihan',
    html: wrap(`
      <h2 style="color: ${hadir ? '#16a34a' : '#ca8a04'};">
        ${hadir ? '✅ Kehadiran Tercatat' : '📋 Ketidakhadiran Tercatat'}
      </h2>
      <p>Halo <strong>${nama}</strong>,</p>
      <p>Kehadiran Anda untuk latihan <strong>${jenisMateri}</strong> telah dicatat sebagai <strong>${hadir ? 'HADIR' : 'TIDAK HADIR'}</strong>.</p>
    `),
  };
}

// ─── Dokumen / Document ───

export function documentReadyEmail(nama: string, docType: string, nomorDokumen: string) {
  const docTypeLabels: Record<string, string> = {
    kartu_anggota: 'Kartu Anggota',
    sertifikat_pendadaran: 'Sertifikat Pendadaran',
    sertifikat_pelatihan: 'Sertifikat Pelatihan',
    piagam_prestasi: 'Piagam Prestasi',
  };

  const label = docTypeLabels[docType] || docType;

  return {
    subject: `Dokumen Siap — ${label}`,
    html: wrap(`
      <h2 style="color: #1a56db;">📄 Dokumen Siap</h2>
      <p>Halo <strong>${nama}</strong>,</p>
      <p>Dokumen Anda telah selesai diproses:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; font-weight: bold; width: 120px;">Jenis Dokumen</td><td style="padding: 8px;">${label}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Nomor Dokumen</td><td style="padding: 8px;">${nomorDokumen}</td></tr>
      </table>
      <p>Silakan hubungi admin untuk mengambil dokumen fisik atau akses dokumen digital Anda melalui aplikasi.</p>
    `),
  };
}

// ─── Klaim / Claim ───

export function claimStatusEmail(nama: string, status: string, reason?: string) {
  const statusLabels: Record<string, { icon: string; color: string; title: string; message: string }> = {
    disetujui: {
      icon: '✅', color: '#16a34a',
      title: 'Klaim Disetujui',
      message: 'Pengajuan klaim Anda telah <strong>disetujui</strong>. Dokumen akan segera diproses.',
    },
    ditolak: {
      icon: '❌', color: '#dc2626',
      title: 'Klaim Ditolak',
      message: 'Pengajuan klaim Anda <strong>tidak dapat disetujui</strong>.',
    },
    diproses: {
      icon: '⚙️', color: '#ca8a04',
      title: 'Klaim Diproses',
      message: 'Pengajuan klaim Anda sedang <strong>diproses</strong>. Silakan tunggu informasi selanjutnya.',
    },
  };

  const info = statusLabels[status] || { icon: '📋', color: '#1a56db', title: 'Update Klaim', message: `Status klaim Anda: ${status}` };

  return {
    subject: `${info.icon} ${info.title} — THS-THM`,
    html: wrap(`
      <h2 style="color: ${info.color};">${info.icon} ${info.title}</h2>
      <p>Halo <strong>${nama}</strong>,</p>
      <p>${info.message}</p>
      ${reason ? `<p>Alasan: <em>${reason}</em></p>` : ''}
    `),
  };
}

// ─── Pendadaran / Graduation ───

export function graduationResultEmail(nama: string, lulus: boolean, skor?: number) {
  return {
    subject: lulus ? '🎉 Selamat! Anda Lulus Pendadaran' : 'Hasil Pendadaran — THS-THM',
    html: wrap(`
      <h2 style="color: ${lulus ? '#16a34a' : '#ca8a04'};">
        ${lulus ? '🎉 Selamat! Anda Lulus Pendadaran' : '📋 Hasil Pendadaran'}
      </h2>
      <p>Halo <strong>${nama}</strong>,</p>
      ${lulus
        ? `<p>Anda telah dinyatakan <strong style="color: #16a34a;">LULUS</strong> dalam ujian pendadaran THS-THM.${skor !== undefined ? ` Total skor: <strong>${skor}</strong>` : ''}</p><p>Selamat atas pencapaian ini! Dokumen sertifikat akan segera diproses.</p>`
        : `<p>Hasil ujian pendadaran Anda: <strong style="color: #ca8a04;">BELUM LULUS</strong>.${skor !== undefined ? ` Total skor: <strong>${skor}</strong>` : ''}</p><p>Jangan menyerah! Silakan berkoordinasi dengan pelatih untuk persiapan pendadaran ulang.</p>`
      }
    `),
  };
}

export function graduationRegisteredEmail(nama: string, namaPendadaran: string, tanggal: string) {
  return {
    subject: 'Pendaftaran Pendadaran — THS-THM',
    html: wrap(`
      <h2 style="color: #1a56db;">📝 Pendaftaran Pendadaran</h2>
      <p>Halo <strong>${nama}</strong>,</p>
      <p>Anda telah terdaftar sebagai peserta pendadaran:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; font-weight: bold; width: 120px;">Pendadaran</td><td style="padding: 8px;">${namaPendadaran}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Tanggal</td><td style="padding: 8px;">${tanggal}</td></tr>
      </table>
      <p>Persiapkan diri Anda dengan baik. Semoga sukses!</p>
    `),
  };
}

// ─── Notifikasi Umum / General Notification ───

export function generalNotificationEmail(nama: string, judul: string, isi: string) {
  return {
    subject: `[THS-THM] ${judul}`,
    html: wrap(`
      <h2 style="color: #1a56db;">${judul}</h2>
      <p>Halo <strong>${nama}</strong>,</p>
      <p>${isi}</p>
    `),
  };
}

// ─── Penguji / Examiner ───

export function examinerWelcomeEmail(nama: string, email: string, setPasswordUrl: string) {
  return {
    subject: 'Akun Penguji THS-THM — Selamat Datang',
    html: wrap(`
      <h2 style="color: #1a56db;">👋 Selamat Datang, ${nama}!</h2>
      <p>Akun <strong>Penguji</strong> Anda telah berhasil dibuat di sistem <strong>THS-THM</strong>.</p>
      <p>Email login Anda: <strong>${email}</strong></p>
      <p>Klik tombol di bawah untuk membuat password dan mengaktifkan akun Anda:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${setPasswordUrl}" style="background-color: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Buat Password
        </a>
      </div>
      <p style="color: #6b7280; font-size: 13px;">
        Link ini akan membawa Anda ke halaman reset password. Masukkan email Anda untuk menerima link reset password.
      </p>
      <p>Silakan login melalui aplikasi setelah password berhasil dibuat untuk melihat jadwal penugasan Anda.</p>
    `),
  };
}

export function examinerAssignmentEmail(nama: string, kegiatanNama: string, tanggal: string, peran: string) {
  return {
    subject: `Penugasan Penguji — ${kegiatanNama}`,
    html: wrap(`
      <h2 style="color: #1a56db;">📋 Penugasan Penguji</h2>
      <p>Halo <strong>${nama}</strong>,</p>
      <p>Anda telah ditugaskan sebagai <strong>${peran}</strong> untuk kegiatan:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; font-weight: bold; width: 100px;">Kegiatan</td><td style="padding: 8px;">${kegiatanNama}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Tanggal</td><td style="padding: 8px;">${tanggal}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Peran</td><td style="padding: 8px;">${peran}</td></tr>
      </table>
      <p>Silakan persiapkan diri untuk melaksanakan tugas sebagai penguji.</p>
    `),
  };
}

// ─── Surat / Letter ───

export function dispositionNotificationEmail(namaPenerima: string, pengirim: string, perihalSurat: string, isiDisposisi: string) {
  return {
    subject: `Disposisi Surat — ${perihalSurat}`,
    html: wrap(`
      <h2 style="color: #1a56db;">📨 Disposisi Surat</h2>
      <p>Halo <strong>${namaPenerima}</strong>,</p>
      <p>Anda menerima disposisi surat dari <strong>${pengirim}</strong>:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; font-weight: bold; width: 100px;">Perihal</td><td style="padding: 8px;">${perihalSurat}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; vertical-align: top;">Isi</td><td style="padding: 8px;">${isiDisposisi}</td></tr>
      </table>
      <p>Silakan tindak lanjuti disposisi ini sesuai arahan.</p>
    `),
  };
}

// ─── User (Admin) ───

export function userWelcomeEmail(nama: string, email: string, role: string, setPasswordUrl: string) {
  const roleLabels: Record<string, string> = {
    superadmin: 'Super Admin',
    admin_distrik: 'Admin Distrik',
    admin_wilayah: 'Admin Wilayah',
    admin_ranting: 'Admin Ranting',
    admin_kegiatan: 'Admin Kegiatan',
  };

  const roleLabel = roleLabels[role] || role;

  return {
    subject: `Akun ${roleLabel} THS-THM — Selamat Datang`,
    html: wrap(`
      <h2 style="color: #1a56db;">👋 Selamat Datang, ${nama}!</h2>
      <p>Akun <strong>${roleLabel}</strong> Anda telah berhasil dibuat di sistem <strong>THS-THM</strong>.</p>
      <p>Email login Anda: <strong>${email}</strong></p>
      <p>Klik tombol di bawah untuk membuat password dan mengaktifkan akun Anda:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${setPasswordUrl}" style="background-color: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Buat Password
        </a>
      </div>
      <p style="color: #6b7280; font-size: 13px;">
        Link ini akan membawa Anda ke halaman reset password. Masukkan email Anda untuk menerima link reset password.
      </p>
      <p>Silakan login melalui aplikasi web untuk mengelola sistem setelah password berhasil dibuat.</p>
    `),
  };
}

// ─── Gamifikasi / Gamification ───

export function badgeEarnedEmail(nama: string, badgeName: string, badgeIcon: string, description: string) {
  return {
    subject: `${badgeIcon} Badge Baru Diraih! — ${badgeName}`,
    html: wrap(`
      <h2 style="color: #a855f7;">${badgeIcon} Badge Baru!</h2>
      <p>Selamat <strong>${nama}</strong>!</p>
      <p>Anda telah mendapatkan badge baru:</p>
      <div style="text-align: center; margin: 24px 0; padding: 20px; background: #faf5ff; border-radius: 12px;">
        <div style="font-size: 64px; line-height: 1;">${badgeIcon}</div>
        <h3 style="color: #7c3aed; margin: 12px 0 4px;">${badgeName}</h3>
        <p style="color: #6b7280; margin: 0;">${description}</p>
      </div>
      <p>Terus aktif berlatih dan berkontribusi untuk mendapatkan lebih banyak badge!</p>
    `),
  };
}

export function levelUpEmail(nama: string, oldLevel: string, newLevel: string, points: number) {
  const levelEmojis: Record<string, string> = {
    Bronze: '🥉',
    Silver: '🥈',
    Gold: '🥇',
    Platinum: '💎',
    Diamond: '🔥',
  };

  const oldEmoji = levelEmojis[oldLevel] || '⭐';
  const newEmoji = levelEmojis[newLevel] || '⭐';

  return {
    subject: `🎉 Level Up! ${nama} naik ke ${newLevel}`,
    html: wrap(`
      <h2 style="color: #f59e0b;">🎉 Level Up!</h2>
      <p>Selamat <strong>${nama}</strong>!</p>
      <p>Anda telah naik level!</p>
      <div style="text-align: center; margin: 24px 0; padding: 20px; background: #fffbeb; border-radius: 12px;">
        <div style="font-size: 32px; margin-bottom: 12px;">
          ${oldEmoji} ${oldLevel} → ${newEmoji} ${newLevel}
        </div>
        <p style="color: #6b7280; font-size: 18px;">Total Poin: <strong>${points.toLocaleString('id-ID')}</strong></p>
      </div>
      <p>Terus semangat dan kumpulkan lebih banyak poin untuk mencapai level berikutnya!</p>
    `),
  };
}
