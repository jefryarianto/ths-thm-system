import { Page } from '@playwright/test';

/**
 * Register mock endpoints for additional dashboard pages: activities, dues, letters,
 * notifications, scan-stats, claims, documents, users, payments, examiners,
 * assessments, graduations, and settings.
 */
export async function registerDashboardPageMocks(page: Page) {
  // ── Admin Queue Stats (fetched by layout for superadmin) ──
  await page.route(/\/api\/admin\/queue-stats/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          counts: { waiting: 3, active: 1 },
        },
      }),
    });
  });

  // ── Graduations / My Assignments (fetched by layout for activity-scoped roles) ──
  await page.route(/\/api\/graduations\/my/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
      }),
    });
  });

  // ── Activities ──
  await page.route(/\/api\/activities(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `activity-${i + 1}`,
          nama: `Kegiatan ${i + 1}`,
          tipe: ['latihan', 'pendadaran', 'sosialisasi', 'rapat', 'lainnya'][i % 5],
          tanggalMulai: new Date(2025, i, 1).toISOString(),
          tanggalSelesai: new Date(2025, i, 2).toISOString(),
          lokasi: `Lokasi ${i + 1}`,
          status: ['draft', 'published', 'closed', 'cancelled'][i % 4],
          pesertaCount: 10 + i * 3,
        })),
        meta: { total: 25, totalPages: 3, page: 1, limit: 10 },
      }),
    });
  });

  // ── Dues / Iuran ──
  await page.route(/\/api\/dues\/dashboard\/stats/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          totalIuran: 45000000,
          totalTransaksi: 320,
          totalLunas: 280,
          totalMenunggak: 40,
          iuranBulanIni: 7500000,
          lunasBulanIni: 85,
          belumBayarBulanIni: 15,
          anggotaAktif: 120,
        },
      }),
    });
  });

  await page.route(/\/api\/dues(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `dues-${i + 1}`,
          anggota: { namaLengkap: `Anggota ${i + 1}` },
          periode: `2025/${String(i + 1).padStart(2, '0')}`,
          jumlah: 50000 + i * 5000,
          status: ['lunas', 'menunggak', 'belum_dibayar'][i % 3],
          createdAt: new Date(2025, i, 15).toISOString(),
        })),
        meta: { total: 50, totalPages: 5, page: 1, limit: 10 },
      }),
    });
  });

  // ── Reports / Dashboard (used by dues chart + reports page) ──
  await page.route(/\/api\/reports\/dashboard/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          totalMembers: 150,
          totalCandidates: 25,
          totalGraduated: 30,
          totalDuesCollected: 45000000,
          pendingValidasi: 5,
          incompleteData: 3,
          totalKegiatan: 12,
          totalLatihan: 48,
          totalKlaim: 8,
          totalDokumen: 60,
          totalPendaftaran: 20,
          totalUsers: 15,
          memberStatus: [
            { status: 'aktif', count: 120 },
            { status: 'nonaktif', count: 20 },
            { status: 'keluar', count: 10 },
          ],
          monthlyDues: [
            { bulan: 'Jan', jumlah: 7500000, transaksi: 50 },
            { bulan: 'Feb', jumlah: 7200000, transaksi: 48 },
            { bulan: 'Mar', jumlah: 7800000, transaksi: 52 },
            { bulan: 'Apr', jumlah: 7400000, transaksi: 49 },
            { bulan: 'Mei', jumlah: 8000000, transaksi: 55 },
          ],
          emailSummary: null,
        },
      }),
    });
  });

  // ── Reports / Scan Stats ──
  await page.route(/\/api\/reports\/scan-stats/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          totalAbsensi: 1200,
          totalDokumen: 450,
          activeKegiatan: 8,
          absensiHarian: Array.from({ length: 30 }, (_, i) => ({
            tanggal: new Date(2025, 0, i + 1).toISOString().split('T')[0],
            count: 20 + Math.floor(Math.random() * 40),
          })),
          recentAbsensi: Array.from({ length: 10 }, (_, i) => ({
            namaAnggota: `Anggota ${i + 1}`,
            nomorAnggota: `THS-${String(i + 1).padStart(5, '0')}`,
            kegiatan: `Kegiatan ${(i % 3) + 1}`,
            hadir: i % 4 !== 0,
            catatan: i % 5 === 0 ? 'Hadir tepat waktu' : undefined,
            tanggal: new Date(2025, 0, 30 - i).toISOString(),
          })),
        },
      }),
    });
  });

  // ── Letters ──
  await page.route(/\/api\/letters/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `letter-${i + 1}`,
          nomorSurat: `S-${i + 1}/THS/2025`,
          type: i % 2 === 0 ? 'masuk' : 'keluar',
          pengirim: i % 2 === 0 ? `Pengirim ${i + 1}` : undefined,
          tujuan: i % 2 !== 0 ? `Tujuan ${i + 1}` : undefined,
          perihal: `Perihal surat nomor ${i + 1}`,
          tanggalSurat: new Date(2025, 0, i + 1).toISOString(),
          status: ['selesai', 'proses', 'pending'][i % 3],
        })),
        meta: { total: 25, totalPages: 3, page: 1, limit: 10 },
      }),
    });
  });

  await page.route(/\/api\/letters\/(incoming|outgoing)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: Array.from({ length: 5 }, (_, i) => ({
          id: `letter-sub-${i + 1}`,
          nomorSurat: `S-${i + 1}/THS/2025`,
          type: route.request().url().includes('incoming') ? 'masuk' : 'keluar',
          pengirim: route.request().url().includes('incoming') ? `Pengirim ${i + 1}` : undefined,
          tujuan: route.request().url().includes('outgoing') ? `Tujuan ${i + 1}` : undefined,
          perihal: `Perihal surat ${i + 1}`,
          tanggalSurat: new Date(2025, 0, i + 1).toISOString(),
          status: ['selesai', 'proses', 'pending'][i % 3],
        })),
        meta: { total: 12, totalPages: 3, page: 1, limit: 10 },
      }),
    });
  });

  // ── Notifications ──
  await page.route(/\/api\/notifications\/count/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { count: 3 } }),
    });
  });

  await page.route(/\/api\/notifications\/stats/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          total: 50,
          unread: 3,
          read: 47,
          byType: {
            umum: { total: 20, unread: 1 },
            welcome: { total: 10, unread: 0 },
            reminder_latihan: { total: 8, unread: 1 },
            reminder_iuran: { total: 5, unread: 1 },
            status_klaim: { total: 7, unread: 0 },
          },
        },
      }),
    });
  });

  await page.route(/\/api\/notifications(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `notif-${i + 1}`,
          judul: `Notifikasi ${i + 1}`,
          isi: `Isi dari notifikasi nomor ${i + 1}`,
          tipe: ['umum', 'reminder_latihan', 'reminder_iuran', 'status_klaim', 'welcome'][i % 5],
          isRead: i >= 3,
          createdAt: new Date(2025, 0, 15 - i).toISOString(),
        })),
        meta: { total: 50, totalPages: 5, page: 1, limit: 10 },
      }),
    });
  });

  // ── Claims ──
  await page.route(/\/api\/claims(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `claim-${i + 1}`,
          anggota: { namaLengkap: `Anggota ${i + 1}` },
          namaLengkap: `Anggota ${i + 1}`,
          tipe: ['keanggotaan', 'dokumen'][i % 2],
          status: ['disetujui', 'pending', 'ditolak'][i % 3],
          ranting: { nama: `Ranting ${i + 1}` },
          createdAt: new Date(2025, 0, i + 1).toISOString(),
        })),
        meta: { total: 20, totalPages: 2, page: 1, limit: 10 },
      }),
    });
  });

  // ── Documents ──
  await page.route(/\/api\/documents(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `doc-${i + 1}`,
          anggota: {
            namaLengkap: `Anggota ${i + 1}`,
            nomorAnggota: `THS-${String(i + 1).padStart(5, '0')}`,
          },
          tipe: ['kartu_anggota', 'sertifikat', 'piagam', 'surat_keterangan'][i % 4],
          status: ['ready', 'processing', 'pending'][i % 3],
          createdAt: new Date(2025, 0, i + 1).toISOString(),
        })),
        meta: { total: 30, totalPages: 3, page: 1, limit: 10 },
      }),
    });
  });

  // ── Users ──
  await page.route(/\/api\/users(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `user-${i + 1}`,
          email: `user${i + 1}@ths-thm.org`,
          namaLengkap: `User ${i + 1}`,
          role: ['superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota'][i % 5],
          isActive: i % 5 !== 0,
          createdAt: new Date(2025, 0, i + 1).toISOString(),
        })),
        meta: { total: 15, totalPages: 2, page: 1, limit: 10 },
      }),
    });
  });

  // ── Payments ──
  await page.route(/\/api\/payments(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `payment-${i + 1}`,
          anggota: { namaLengkap: `Anggota ${i + 1}` },
          metode: ['transfer', 'tunai', 'qris'][i % 3],
          jumlah: 50000 + i * 10000,
          status: ['confirmed', 'pending', 'failed'][i % 3],
          createdAt: new Date(2025, 0, i + 1).toISOString(),
        })),
        meta: { total: 40, totalPages: 4, page: 1, limit: 10 },
      }),
    });
  });

  // ── Examiners / Penguji ──
  await page.route(/\/api\/examiners(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `examiner-${i + 1}`,
          user: { namaLengkap: `Penguji ${i + 1}` },
          keahlian: ['Pencak Silat', 'Senam', 'Teori', 'Praktek'][i % 4],
          isActive: i % 3 !== 0,
        })),
        meta: { total: 12, totalPages: 2, page: 1, limit: 10 },
      }),
    });
  });

  // ── Assessments / Aspek Penilaian ──
  await page.route(/\/api\/assessments\/aspects(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: Array.from({ length: 8 }, (_, i) => ({
          id: `aspect-${i + 1}`,
          kodeAspek: `ASP-${i + 1}`,
          namaAspek: `Aspek ${i + 1}`,
          deskripsi: `Deskripsi aspek ${i + 1}`,
          bobot: 10 + i * 5,
          isActive: true,
          itemPenilaian: Array.from({ length: 3 }, (_, j) => ({
            id: `item-${i}-${j}`,
            kodeItem: `ITM-${i}-${j}`,
            namaItem: `Item ${i + 1}.${j + 1}`,
            skorMaksimal: 100,
            bobot: 1,
          })),
        })),
        meta: { total: 8, totalPages: 1, page: 1, limit: 10 },
      }),
    });
  });

  // ── Assessments / Item Penilaian (separate endpoint) ──
  await page.route(/\/api\/assessments\/items(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: Array.from({ length: 12 }, (_, i) => ({
          id: `item-${i + 1}`,
          aspekId: `aspect-${Math.floor(i / 3) + 1}`,
          aspek: { namaAspek: `Aspek ${Math.floor(i / 3) + 1}` },
          kodeItem: `ITM-${i + 1}`,
          namaItem: `Item ${i + 1}`,
          skorMaksimal: 100,
          bobot: 1,
          isActive: true,
        })),
        meta: { total: 12, totalPages: 2, page: 1, limit: 10 },
      }),
    });
  });

  // ── Graduations / Pendadaran ──
  await page.route(/\/api\/graduations(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `graduation-${i + 1}`,
          nama: `Pendadaran ${i + 1}`,
          namaKegiatan: `Pendadaran ${i + 1}`,
          tanggal: new Date(2025, 2, i + 1).toISOString(),
          tanggalMulai: new Date(2025, 2, i + 1).toISOString(),
          lokasi: `Lokasi ${i + 1}`,
          pesertaCount: 5 + i,
          status: ['scheduled', 'completed', 'cancelled'][i % 3],
        })),
        meta: { total: 15, totalPages: 2, page: 1, limit: 10 },
      }),
    });
  });

  // ── Settings ──
  await page.route(/\/api\/settings$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          nama: 'THS-THM',
          alamat: 'Jl. Contoh No. 1',
          noTelp: '021-1234567',
          email: 'admin@ths-thm.org',
          website: 'https://ths-thm.org',
        },
      }),
    });
  });

  await page.route(/\/api\/settings\/periods/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { id: 'period-1', nama: '2025/2026', isActive: true },
          { id: 'period-2', nama: '2024/2025', isActive: false },
        ],
      }),
    });
  });

  await page.route(/\/api\/settings\/signatures/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { id: 'sig-1', namaLengkap: 'Ketua THS', jabatan: 'Ketua', isActive: true },
          { id: 'sig-2', namaLengkap: 'Sekretaris', jabatan: 'Sekretaris', isActive: true },
        ],
      }),
    });
  });

  await page.route(/\/api\/settings\/stamp/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { nama: 'Stempel THS-THM', label: 'Stempel Resmi' },
      }),
    });
  });

  // ── Org Documents ──
  await page.route(/\/api\/org-documents(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `orgdoc-${i + 1}`,
          nama: `Dokumen Organisasi ${i + 1}`,
          tipe: ['AD/ART', 'SOP', 'Laporan', 'Notulensi'][i % 4],
          status: ['published', 'draft', 'archived'][i % 3],
          createdAt: new Date(2025, 0, i + 1).toISOString(),
        })),
        meta: { total: 15, totalPages: 2, page: 1, limit: 10 },
      }),
    });
  });

  // ── Registrations (paginated list) ──
  await page.route(/\/api\/registrations(\?|$)/, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: Array.from({ length: 10 }, (_, i) => ({
            id: `reg-${i + 1}`,
            namaLengkap: `Pendaftar ${i + 1}`,
            jenisKelamin: i % 2 === 0 ? 'L' : 'P',
            status: ['pending', 'approved', 'rejected'][i % 3],
            createdAt: new Date(2025, 0, i + 1).toISOString(),
          })),
          meta: { total: 30, totalPages: 3, page: 1, limit: 10 },
        }),
      });
    } else {
      await route.continue();
    }
  });
}
