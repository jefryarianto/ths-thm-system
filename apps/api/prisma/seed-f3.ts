import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PENGUJI_EMAIL = 'penguji.f3@ths-thm.test';
const PENGUJI_PASSWORD = 'Password123!';
const KEGIATAN_NAMA = 'Pendadaran Uji Runtime F3 - 2024';
const CALON_NAMA = 'Calon Anggota Uji Runtime F3';

const aspekSeed = [
  {
    kodeAspek: 'F3-ASP-A',
    namaAspek: 'Keorganisasian THS-HT',
    bobot: 40,
    items: [
      { kodeItem: 'F3-ITM-A1', namaItem: 'Pemahaman Sejarah THS', skorMaksimal: 100, bobot: 50, urutan: 1 },
      { kodeItem: 'F3-ITM-A2', namaItem: 'Pemahaman Asas & Dasar', skorMaksimal: 100, bobot: 50, urutan: 2 },
    ],
  },
  {
    kodeAspek: 'F3-ASP-B',
    namaAspek: 'Konsep & Praktik Fasilitasi',
    bobot: 60,
    items: [
      { kodeItem: 'F3-ITM-B1', namaItem: 'Perencanaan Fasilitasi', skorMaksimal: 100, bobot: 40, urutan: 1 },
      { kodeItem: 'F3-ITM-B2', namaItem: 'Teknik Presentasi', skorMaksimal: 100, bobot: 30, urutan: 2 },
      { kodeItem: 'F3-ITM-B3', namaItem: 'Penanganan Dinamika Kelompok', skorMaksimal: 100, bobot: 30, urutan: 3 },
    ],
  },
];

async function main() {
  // 1. Penguji
  const passwordHash = await bcrypt.hash(PENGUJI_PASSWORD, 12);
  const penguji = await prisma.user.upsert({
    where: { email: PENGUJI_EMAIL },
    update: { isActive: true },
    create: {
      email: PENGUJI_EMAIL,
      passwordHash,
      namaLengkap: 'Penguji F3 Test',
      role: 'penguji',
      isActive: true,
    },
  });
  console.log('[F3] penguji:', penguji.email, '|', penguji.id);

  // 2. Scope: ranting milik pengguna aktif (typed, aman terhadap nama tabel)
  const userAktif = await prisma.user.findFirst({
    where: { isActive: true, rantingId: { not: null } },
    include: { ranting: true },
  });
  let rantingId: string;
  let rantingNama: string;
  if (userAktif?.ranting) {
    rantingId = userAktif.ranting.id;
    rantingNama = userAktif.ranting.nama;
  } else {
    const anyRanting = await prisma.ranting.findFirst();
    if (!anyRanting) throw new Error('Tidak ada Ranting di DB. Jalankan seed-members dulu.');
    rantingId = anyRanting.id;
    rantingNama = anyRanting.nama;
  }
  console.log('[F3] scope ranting:', rantingId, rantingNama);

  // 3. Kegiatan pendadaran (idempotent)
  let kegiatan = await prisma.kegiatan.findFirst({
    where: { nama: KEGIATAN_NAMA },
  });
  if (!kegiatan) {
    kegiatan = await prisma.kegiatan.create({
      data: {
        nama: KEGIATAN_NAMA,
        tipe: 'pendadaran',
        scopeType: 'ranting',
        scopeId: rantingId,
        tanggalMulai: new Date('2024-06-10T01:00:00.000Z'),
        tanggalSelesai: new Date('2024-06-12T09:00:00.000Z'),
        status: 'published',
        createdBy: penguji.id,
      },
    });
  }
  console.log('[F3] kegiatan:', kegiatan.id, kegiatan.nama, '|', kegiatan.tipe, kegiatan.scopeType);

  // 4. Calon anggota peserta: self-contained (idempotent by nama)
  let calon = await prisma.pesertaPendadaran.findFirst({
    where: { kegiatanId: kegiatan.id },
  });
  if (!calon) {
    let calonAnggota = await prisma.calonAnggota.findFirst({
      where: { rantingId, namaLengkap: CALON_NAMA },
    });
    if (!calonAnggota) {
      calonAnggota = await prisma.calonAnggota.create({
        data: {
          rantingId,
          namaLengkap: CALON_NAMA,
          jenisKelamin: 'L',
          status: 'diusulkan',
          usulOlehUserId: penguji.id,
        },
      });
    }
    calon = await prisma.pesertaPendadaran.create({
      data: {
        kegiatanId: kegiatan.id,
        calonAnggotaId: calonAnggota.id,
      },
    });
  }
  console.log('[F3] peserta pendadaran:', calon.calonAnggotaId);

  // 5. Aspek + Item (idempotent)
  for (const a of aspekSeed) {
    let aspek = await prisma.aspekPenilaian.findFirst({
      where: { kegiatanId: kegiatan.id, kodeAspek: a.kodeAspek },
    });
    if (!aspek) {
      aspek = await prisma.aspekPenilaian.create({
        data: {
          kegiatanId: kegiatan.id,
          kodeAspek: a.kodeAspek,
          namaAspek: a.namaAspek,
          bobot: a.bobot,
          isActive: true,
        },
      });
    }
    for (const it of a.items) {
      const existing = await prisma.itemPenilaian.findFirst({
        where: { aspekId: aspek.id, kodeItem: it.kodeItem },
      });
      if (!existing) {
        await prisma.itemPenilaian.create({
          data: {
            aspekId: aspek.id,
            kodeItem: it.kodeItem,
            namaItem: it.namaItem,
            skorMaksimal: it.skorMaksimal,
            bobot: it.bobot,
            urutan: it.urutan,
            isActive: true,
          },
        });
      }
    }
    console.log('[F3] aspek:', aspek.id, a.kodeAspek, '| items di-clone/skip');
  }

  // 6. Penugasan penguji (approved) agar muncul di daftar "pendadaran penguji"
  let penugasan = await prisma.penugasanPenguji.findFirst({
    where: { pengujiUserId: penguji.id, kegiatanId: kegiatan.id },
  });
  if (!penugasan) {
    penugasan = await prisma.penugasanPenguji.create({
      data: {
        pengujiUserId: penguji.id,
        kegiatanId: kegiatan.id,
        status: 'approved',
        disetujuiOleh: penguji.id,
        disetujuiAt: new Date(),
      },
    });
  } else if (penugasan.status !== 'approved') {
    penugasan = await prisma.penugasanPenguji.update({
      where: { id: penugasan.id },
      data: { status: 'approved' },
    });
  }
  console.log('[F3] penugasan penguji:', penugasan.id, '|', penugasan.status);

  console.log('\n=== READY F3 RUNTIME TEST ===');
  console.log('Login penguji :', PENGUJI_EMAIL, '/', PENGUJI_PASSWORD);
  console.log('Kegiatan      :', KEGIATAN_NAMA, '(', kegiatan.id, ')');
  console.log('Calon anggota :', calon.calonAnggotaId);
  console.log('Langkah: login > menu Pendadaran > buka kegiatan di atas > tombol "Input Nilai Penguji"');
}

main()
  .catch((e) => {
    console.error('[F3] GAGAL:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
