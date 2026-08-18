import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user — password matches E2E smoke test login
  const passwordHash = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'superadmin@ths-thm.org' },
    update: {},
    create: {
      email: 'superadmin@ths-thm.org',
      passwordHash,
      namaLengkap: 'Super Admin',
      role: 'superadmin',
      isActive: true,
    },
  });
  console.log(`Admin user created: ${admin.email}`);

  // Create approval levels
  const levels = [
    { name: 'Admin Ranting', roleName: 'admin_ranting', order: 1 },
    { name: 'Admin Wilayah', roleName: 'admin_wilayah', order: 2 },
    { name: 'Admin Distrik', roleName: 'admin_distrik', order: 3 },
  ];

  for (const level of levels) {
    await prisma.approvalLevel.upsert({
      where: { id: level.name },
      update: {},
      create: {
        id: level.name,
        name: level.name,
        roleName: level.roleName,
        order: level.order,
        isActive: true,
      },
    });
  }
  console.log('Approval levels created');

  // Create default organization structure
  const nasional = await prisma.nasional.upsert({
    where: { kode: 'THS-NAS' },
    update: {},
    create: { kode: 'THS-NAS', nama: 'THS-THM Nasional' },
  });

  const distrik = await prisma.distrik.upsert({
    where: { kodeDistrik: 'THS-DST-01' },
    update: {},
    create: {
      nasionalId: nasional.id,
      kodeDistrik: 'THS-DST-01',
      nama: 'Distrik Example',
    },
  });

  // kodeWilayah/kodeRanting are not unique columns — use findFirst + create/update
  let wilayah = await prisma.wilayah.findFirst({ where: { kodeWilayah: 'THS-WLY-01' } });
  if (!wilayah) {
    wilayah = await prisma.wilayah.create({
      data: {
        distrikId: distrik.id,
        kodeWilayah: 'THS-WLY-01',
        nama: 'Wilayah Example',
      },
    });
  }

  let ranting = await prisma.ranting.findFirst({ where: { kodeRanting: 'THS-RTG-01' } });
  if (!ranting) {
    ranting = await prisma.ranting.create({
      data: {
        wilayahId: wilayah.id,
        kodeRanting: 'THS-RTG-01',
        nama: 'Ranting Example',
      },
    });
  }
  console.log('Organization structure created');

  // ── Seeder Users ──
  // Create ranting admin user
  const rantingAdmin = await prisma.user.upsert({
    where: { email: 'admin.ranting@ths-thm.org' },
    update: {},
    create: {
      email: 'admin.ranting@ths-thm.org',
      passwordHash,
      namaLengkap: 'Admin Ranting',
      role: 'admin_ranting',
      rantingId: ranting.id,
      isActive: true,
    },
  });
  console.log(`Ranting admin created: ${rantingAdmin.email}`);

  // ── Seeder Members ──
  const sampleMembers = [
    {
      nomorAnggota: 'THS-2026-0001',
      namaLengkap: 'Anggota Contoh',
      jenisKelamin: 'L' as const,
      tempatLahir: 'Jakarta',
      tanggalLahir: new Date('1990-01-15'),
      alamat: 'Jl. Merdeka No. 10, Jakarta Pusat',
      noHp: '081234567890',
      email: 'anggota.contoh@email.com',
      statusKeanggotaan: 'aktif' as const,
      statusData: 'complete' as const,
      statusValidasi: 'approved' as const,
    },
    {
      nomorAnggota: 'THS-2026-0002',
      namaLengkap: 'Siti Rahmawati',
      jenisKelamin: 'P' as const,
      tempatLahir: 'Bandung',
      tanggalLahir: new Date('1992-06-20'),
      alamat: 'Jl. Diponegoro No. 25, Bandung',
      noHp: '082345678901',
      email: 'siti.rahmawati@email.com',
      statusKeanggotaan: 'aktif' as const,
      statusData: 'complete' as const,
      statusValidasi: 'approved' as const,
    },
    {
      nomorAnggota: 'THS-2026-0003',
      namaLengkap: 'Budi Santoso',
      jenisKelamin: 'L' as const,
      tempatLahir: 'Surabaya',
      tanggalLahir: new Date('1988-11-03'),
      alamat: 'Jl. Pahlawan No. 5, Surabaya',
      noHp: '083456789012',
      email: 'budi.santoso@email.com',
      statusKeanggotaan: 'nonaktif' as const,
      statusData: 'complete' as const,
      statusValidasi: 'approved' as const,
    },
  ];

  for (const m of sampleMembers) {
    const member = await prisma.anggota.upsert({
      where: { nomorAnggota: m.nomorAnggota },
      update: {},
      create: {
        rantingId: ranting.id,
        ...m,
      },
    });
    console.log(`Member created: ${member.namaLengkap} (${member.nomorAnggota})`);
  }

  // ── Seeder Email Template Examples ──
  const exampleTemplates = [
    {
      name: 'welcomeMemberEmail',
      subject: 'Selamat Datang, {{nama}}! — THS-THM',
      htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1a56db;">Selamat Datang, {{nama}}!</h1>
  <p>Terima kasih telah bergabung dengan <strong>THS-THM</strong>.</p>
  <p>Silakan login ke aplikasi untuk melengkapi profil Anda dan mengikuti kegiatan yang tersedia.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
  <p style="color: #6b7280; font-size: 12px;">THS-THM System</p>
</div>`,
      isActive: false,
    },
    {
      name: 'approvedMemberEmail',
      subject: 'Selamat! {{nama}} Telah Menjadi Anggota THS-THM',
      htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #16a34a;">Selamat, {{nama}}!</h1>
  <p>Anda telah resmi menjadi anggota <strong>THS-THM</strong>.</p>
  <p>Nomor Anggota: <strong>{{nomorAnggota}}</strong></p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
  <p style="color: #6b7280; font-size: 12px;">THS-THM System</p>
</div>`,
      isActive: false,
    },
    {
      name: 'resetPasswordEmail',
      subject: 'Reset Password — THS-THM System',
      htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a56db;">Reset Password</h2>
  <p>Halo <strong>{{nama}}</strong>,</p>
  <p>Klik tombol di bawah untuk mereset password Anda:</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{resetUrl}}" style="background-color: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
  </div>
  <p style="color: #6b7280; font-size: 12px;">Jika Anda tidak meminta reset password, abaikan email ini.</p>
</div>`,
      isActive: false,
    },
    {
      name: 'registrationApprovedEmail',
      subject: 'Pendaftaran Disetujui — {{nama}}',
      htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a56db;">Selamat, {{nama}}!</h2>
  <p>Pendaftaran Anda telah disetujui. Anda sekarang terdaftar sebagai calon anggota THS-THM.</p>
  <p>Silakan menunggu proses selanjutnya untuk menjadi anggota resmi.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
  <p style="color: #6b7280; font-size: 12px;">THS-THM System</p>
</div>`,
      isActive: false,
    },
    {
      name: 'paymentConfirmationEmail',
      subject: 'Konfirmasi Pembayaran Iuran — THS-THM',
      htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #16a34a;">Pembayaran Diterima</h2>
  <p>Halo <strong>{{nama}}</strong>,</p>
  <p>Pembayaran iuran periode <strong>{{periode}}</strong> sebesar <strong>Rp {{jumlah}}</strong> telah diterima.</p>
  <p>Terima kasih atas kontribusi Anda.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
  <p style="color: #6b7280; font-size: 12px;">THS-THM System — Notifikasi iuran otomatis</p>
</div>`,
      isActive: false,
    },
    {
      name: 'claimStatusEmail',
      subject: 'Status Klaim: {{status}} — THS-THM',
      htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a56db;">Update Status Klaim</h2>
  <p>Halo <strong>{{nama}}</strong>,</p>
  <p>Status klaim Anda: <strong>{{status}}</strong></p>
  <p>Alasan: {{alasan}}</p>
  <p>Silakan login ke aplikasi untuk detail lebih lanjut.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
  <p style="color: #6b7280; font-size: 12px;">THS-THM System</p>
</div>`,
      isActive: false,
    },
    {
      name: 'badgeEarnedEmail',
      subject: '{{badgeIcon}} Badge Baru! {{badgeName}}',
      htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #a855f7;">Badge Baru Diraih!</h2>
  <p>Selamat <strong>{{nama}}</strong>!</p>
  <div style="text-align: center; margin: 24px 0; padding: 20px; background: #faf5ff; border-radius: 12px;">
    <div style="font-size: 64px;">{{badgeIcon}}</div>
    <h3 style="color: #7c3aed; margin: 12px 0;">{{badgeName}}</h3>
    <p style="color: #6b7280;">{{description}}</p>
  </div>
  <p>Terus aktif berkontribusi untuk mendapatkan lebih banyak badge!</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
  <p style="color: #6b7280; font-size: 12px;">THS-THM System — Gamifikasi</p>
</div>`,
      isActive: false,
    },
    {
      name: 'activityInvitationEmail',
      subject: 'Undangan Kegiatan — {{kegiatanNama}}',
      htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a56db;">Undangan Kegiatan</h2>
  <p>Halo <strong>{{nama}}</strong>,</p>
  <p>Anda telah didaftarkan sebagai peserta kegiatan:</p>
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 8px; font-weight: bold;">Kegiatan</td><td style="padding: 8px;">{{kegiatanNama}}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">Tanggal</td><td style="padding: 8px;">{{tanggal}}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">Lokasi</td><td style="padding: 8px;">{{lokasi}}</td></tr>
  </table>
  <p>Mohon hadir tepat waktu.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
  <p style="color: #6b7280; font-size: 12px;">THS-THM System</p>
</div>`,
      isActive: false,
    },
  ];

  for (const tpl of exampleTemplates) {
    await prisma.emailTemplate.upsert({
      where: { name: tpl.name },
      update: {},
      create: tpl,
    });
  }
  console.log(`Seeded ${exampleTemplates.length} example email templates`);

  // ── Seeder Organization Settings ──
  const orgSettings = [
    { key: 'nama', value: 'THS-THM (Tapak Suci Putera Muhammadiyah)' },
    { key: 'alamat', value: 'Jl. K.H. Ahmad Dahlan No. 103, Yogyakarta' },
    { key: 'noTelp', value: '(0274) 123456' },
    { key: 'email', value: 'admin@ths-thm.org' },
    { key: 'website', value: 'https://ths-thm.org' },
  ];

  for (const s of orgSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }
  console.log(`Seeded ${orgSettings.length} organization settings`);

  // ── Seeder Gamification Settings ──
  const gamificationSettings = [
    { key: 'gamification_points_training', value: 10 },
    { key: 'gamification_points_dues_on_time', value: 20 },
    { key: 'gamification_points_dues_late', value: 5 },
    { key: 'gamification_level_bronze_min', value: 0 },
    { key: 'gamification_level_silver_min', value: 100 },
    { key: 'gamification_level_gold_min', value: 300 },
    { key: 'gamification_level_platinum_min', value: 500 },
    { key: 'gamification_level_diamond_min', value: 1000 },
  ];

  for (const s of gamificationSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }
  console.log(`Seeded ${gamificationSettings.length} gamification settings`);

  // ── Seeder Forum Categories ──
  const forumCategories = [
    { nama: 'Pengumuman', deskripsi: 'Pengumuman resmi organisasi THS-THM', order: 0 },
    { nama: 'Diskusi Umum', deskripsi: 'Tempat diskusi bebas antar anggota', order: 1 },
    { nama: 'Latihan & Teknik', deskripsi: 'Diskusi seputar latihan, teknik, dan materi Tapak Suci', order: 2 },
    { nama: 'Organisasi & Kepengurusan', deskripsi: 'Pembahasan organisasi, kepengurusan, dan administrasi', order: 3 },
    { nama: 'Kegiatan & Acara', deskripsi: 'Informasi dan diskusi kegiatan, acara, dan pendadaran', order: 4 },
    { nama: 'Saran & Masukan', deskripsi: 'Kritik, saran, dan masukan untuk kemajuan organisasi', order: 5 },
  ];

  const existingCategoryCount = await prisma.forumCategory.count();
  if (existingCategoryCount === 0) {
    let seeded = 0;
    for (const cat of forumCategories) {
      await prisma.forumCategory.create({ data: cat });
      seeded++;
    }
    console.log(`Seeded ${seeded} forum categories`);
  } else {
    console.log(`Forum categories sudah ada (${existingCategoryCount}). Lewati seed forum.`);
  }

  // ── Seeder Penandatangan ──
  const existingSignerCount = await prisma.penandatangan.count();
  if (existingSignerCount === 0) {
    await prisma.penandatangan.create({
      data: { nama: 'Yoseph Pehan Betan', jabatan: 'Koordinator Distrik', isActive: true },
    });
    console.log('Seeded 1 penandatangan');
  } else {
    console.log(`Penandatangan sudah ada (${existingSignerCount}). Lewati seed penandatangan.`);
  }

  // ── Seeder Tingkatan (pengaturan strip kartu anggota) ──
  const tingkatanSeed = [
    { nama: 'Anggota', stripCount: 0, stripWarna: '#94a3b8', urutan: 1 },
    { nama: 'Pratama', stripCount: 1, stripWarna: '#1d4ed8', urutan: 2 },
    { nama: 'Tamtama', stripCount: 2, stripWarna: '#1d4ed8', urutan: 3 },
    { nama: 'Muda', stripCount: 1, stripWarna: '#ca8a04', urutan: 4 },
    { nama: 'Madya', stripCount: 2, stripWarna: '#ca8a04', urutan: 5 },
    { nama: 'Utama', stripCount: 3, stripWarna: '#ca8a04', urutan: 6 },
  ];

  const existingTingkatanCount = await prisma.tingkatan.count();
  if (existingTingkatanCount === 0) {
    let seededT = 0;
    for (const t of tingkatanSeed) {
      await prisma.tingkatan.create({ data: t });
      seededT++;
    }
    console.log(`Seeded ${seededT} tingkatan`);
  } else {
    console.log(`Tingkatan sudah ada (${existingTingkatanCount}). Lewati seed tingkatan.`);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });