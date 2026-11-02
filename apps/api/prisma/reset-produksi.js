#!/usr/bin/env node
/**
 * Bersihkan database untuk go-live produksi — benar-benar fresh.
 *
 * Menghapus SELURUH data di schema `public` (kecuali tabel riwayat migrasi
 * `_prisma_migrations`), lalu membuat satu akun superadmin.
 * Struktur tabel TIDAK diubah — jalankan `prisma migrate deploy` lebih dulu.
 *
 * Pemakaian:
 *   node prisma/reset-produksi.js            # dry-run: hanya daftar tabel
 *   node prisma/reset-produksi.js --yes      # EKSEKUSI: hapus semua data
 *
 * Env:
 *   DATABASE_URL          (wajib) koneksi Postgres tujuan
 *   SUPERADMIN_EMAIL      default: superadmin@ths-thm.cloud
 *   SUPERADMIN_NAME       default: Super Admin
 *   SUPERADMIN_PASSWORD   (wajib) password superadmin — TIDAK ada default
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const CONFIRM_FLAG = '--yes';
const EMAIL = (process.env.SUPERADMIN_EMAIL || 'superadmin@ths-thm.cloud').trim().toLowerCase();
const NAMA = (process.env.SUPERADMIN_NAME || 'Super Admin').trim();
const PASSWORD = process.env.SUPERADMIN_PASSWORD || '';
const PASSWORD_SOURCE = PASSWORD ? 'SUPERADMIN_PASSWORD' : 'undefined';

const MIGRATION_TABLE = '_prisma_migrations';

function banner(line) {
  console.log(line);
}

async function listTables(prisma) {
  const rows = await prisma.$queryRaw`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> ${MIGRATION_TABLE}
    ORDER BY tablename
  `;
  return rows.map((r) => r.tablename);
}

async function countRows(prisma, table) {
  try {
    const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "${table}"`);
    return Number(rows[0]?.n ?? 0);
  } catch {
    return null;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL belum diset.');
    process.exit(1);
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(EMAIL)) {
    console.error(`❌ SUPERADMIN_EMAIL tidak valid: ${EMAIL}`);
    process.exit(1);
  }

  if (!PASSWORD) {
    console.error(
      '❌ SUPERADMIN_PASSWORD belum diset. ' +
        'Sediakan lewat environment variable (tidak ada password default).',
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const tables = await listTables(prisma);

    banner('==========================================================');
    banner(' RESET DATABASE PRODUKSI — semua data dikosongkan');
    banner('==========================================================');
    banner(`Tabel data        : ${tables.length}`);
    banner(`Riwayat migrasi   : ${MIGRATION_TABLE} (tidak diubah)`);
    banner(`Akun yang dibuat  : ${EMAIL} (role: superadmin)`);
    banner(`Password          : dari ${PASSWORD_SOURCE}`);
    banner('');

    if (!process.argv.includes(CONFIRM_FLAG)) {
      // Dry-run: tampilkan tabel yang berisi data agar operator bisa
      // memastikan yang dihapus memang data yang dimaksud.
      banner('Mode DRY-RUN — belum ada data yang diubah.');
      banner('');
      let total = 0;
      let withData = 0;
      for (const table of tables) {
        const n = await countRows(prisma, table);
        if (n === null || n === 0) continue;
        withData += 1;
        total += n;
        banner(`  ${String(n).padStart(7, ' ')}  ${table}`);
      }
      banner('');
      banner(`Tabel berisi data: ${withData} dari ${tables.length} | total baris: ${total}`);
      banner('');
      banner('Untuk benar-benar menghapus, jalankan:');
      banner(`  node prisma/reset-produksi.js ${CONFIRM_FLAG}`);
      return;
    }

    // DELETE per tabel, bukan TRUNCATE ... CASCADE: CASCADE ikut mengosongkan
    // tabel anak yang mereferensi tabel yang dihapus, sehingga hasilnya sulit
    // diprediksi. Dengan DELETE, urutan ditentukan percobaan berulang:
    // hapus anak dulu, induk menyusul setelah FK-nya tidak lagi menunjuk data.
    banner('Menghapus seluruh data...');
    const pending = new Set(tables);
    let emptied = 0;
    for (let pass = 0; pass < 12 && pending.size > 0; pass += 1) {
      let progress = 0;
      for (const table of [...pending]) {
        try {
          await prisma.$executeRawUnsafe(`DELETE FROM "${table.replace(/"/g, '""')}"`);
          pending.delete(table);
          emptied += 1;
          progress += 1;
        } catch {
          // Masih dirujuk tabel lain — coba lagi pada putaran berikutnya.
        }
      }
      if (progress === 0) break;
    }
    if (pending.size > 0) {
      throw new Error(
        `Gagal mengosongkan ${pending.size} tabel (kemungkinan FK melingkar): ${[...pending].join(', ')}`,
      );
    }
    banner(`✅ ${emptied} tabel dikosongkan.`);

    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    // upsert: aman dijalankan ulang (mis. saat data sudah bersih) tanpa
    // menabrak constraint unik email.
    const user = await prisma.user.upsert({
      where: { email: EMAIL },
      update: {
        passwordHash,
        namaLengkap: NAMA,
        role: 'superadmin',
        isActive: true,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      create: {
        email: EMAIL,
        passwordHash,
        namaLengkap: NAMA,
        role: 'superadmin',
        isActive: true,
      },
      select: { id: true, email: true, role: true, isActive: true },
    });

    banner('');
    banner('✅ Akun superadmin dibuat:');
    banner(`   id    : ${user.id}`);
    banner(`   email : ${user.email}`);
    banner(`   role  : ${user.role}`);
    banner(`   aktif : ${user.isActive}`);
    banner('');
    banner('Reset selesai — database siap menerima data baru.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Reset gagal:', error instanceof Error ? error.message : error);
  process.exit(1);
});
