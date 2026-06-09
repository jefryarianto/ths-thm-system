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
