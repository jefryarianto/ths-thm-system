/**
 * Data & logika seed TEMPLATE GLOBAL aspek + item penilaian pendadaran
 * (AspekPenilaian dengan kegiatanId = null). Template inilah yang di-clone
 * ke setiap pendadaran baru (lihat AssessmentsService.cloneTemplateForKegiatan)
 * dan menjadi fallback penilaian untuk pendadaran yang belum punya set sendiri.
 *
 * IDEMPOTEN — aman dijalankan berulang kali:
 * - Aspek dicari per (kegiatanId: null, kodeAspek); sudah ada → dilewati.
 * - Item dicari per (aspekId, kodeItem); sudah ada → dilewati.
 * - Data yang sudah ada TIDAK ditimpa, agar penyesuaian manual admin
 *   terhadap template tidak tertimpa saat seed dijalankan ulang.
 *
 * Dieksekusi via wrapper CLI: `pnpm --filter @ths-thm/api prisma:seed:aspek-template`
 * (prisma/seed-aspek-template.ts). Logika dipisah ke sini agar idempotensi
 * bisa diverifikasi lewat unit test (seed-aspek-template.spec.ts).
 */

export interface AspekTemplateItemSeed {
  kodeItem: string;
  namaItem: string;
  skorMaksimal: number;
  bobot: number;
  urutan: number;
}

export interface AspekTemplateSeed {
  kodeAspek: string;
  namaAspek: string;
  deskripsi?: string;
  bobot: number;
  items: AspekTemplateItemSeed[];
}

export interface SeedAspekTemplatePrisma {
  aspekPenilaian: {
    findFirst(args: { where: { kegiatanId: null; kodeAspek: string } }): Promise<{ id: string; kodeAspek: string } | null>;
    create(args: {
      data: {
        kodeAspek: string;
        namaAspek: string;
        deskripsi?: string;
        bobot: number;
        isActive: boolean;
        kegiatanId: null;
      };
    }): Promise<{ id: string; kodeAspek: string }>;
    count(args: { where: { kegiatanId: null; isActive: boolean } }): Promise<number>;
  };
  itemPenilaian: {
    findFirst(args: { where: { aspekId: string; kodeItem: string } }): Promise<unknown>;
    create(args: {
      data: {
        aspekId: string;
        kodeItem: string;
        namaItem: string;
        skorMaksimal: number;
        bobot: number;
        urutan: number;
        isActive: boolean;
      };
    }): Promise<unknown>;
  };
}

export interface SeedAspekTemplateResult {
  aspekBaru: number;
  itemBaru: number;
  aspekSkip: number;
  itemSkip: number;
  totalAktif: number;
}

// Total bobot aspek = 100. Bobot item = distribusi dalam aspeknya (total 100).
export const aspekTemplateSeed: AspekTemplateSeed[] = [
  {
    kodeAspek: 'TPL-ASP-A',
    namaAspek: 'Keorganisasian',
    deskripsi: 'Pemahaman dan pengamalan dasar-dasar organisasi',
    bobot: 40,
    items: [
      { kodeItem: 'TPL-ITM-A1', namaItem: 'Pemahaman sejarah, asas, dan dasar organisasi', skorMaksimal: 100, bobot: 50, urutan: 1 },
      { kodeItem: 'TPL-ITM-A2', namaItem: 'Pemahaman struktur, tata tertib, dan kedudukan anggota', skorMaksimal: 100, bobot: 50, urutan: 2 },
    ],
  },
  {
    kodeAspek: 'TPL-ASP-B',
    namaAspek: 'Keterampilan Fasilitasi',
    deskripsi: 'Kemampuan merencanakan dan memfasilitasi kegiatan',
    bobot: 40,
    items: [
      { kodeItem: 'TPL-ITM-B1', namaItem: 'Perencanaan & persiapan sesi', skorMaksimal: 100, bobot: 40, urutan: 1 },
      { kodeItem: 'TPL-ITM-B2', namaItem: 'Teknik penyampaian & presentasi', skorMaksimal: 100, bobot: 30, urutan: 2 },
      { kodeItem: 'TPL-ITM-B3', namaItem: 'Penanganan dinamika kelompok', skorMaksimal: 100, bobot: 30, urutan: 3 },
    ],
  },
  {
    kodeAspek: 'TPL-ASP-C',
    namaAspek: 'Sikap & Mental',
    deskripsi: 'Sikap pribadi dan kemampuan bekerja sama',
    bobot: 20,
    items: [
      { kodeItem: 'TPL-ITM-C1', namaItem: 'Disiplin & tanggung jawab', skorMaksimal: 100, bobot: 50, urutan: 1 },
      { kodeItem: 'TPL-ITM-C2', namaItem: 'Kerja sama & komunikasi', skorMaksimal: 100, bobot: 50, urutan: 2 },
    ],
  },
];

export async function seedAspekTemplate(prisma: SeedAspekTemplatePrisma): Promise<SeedAspekTemplateResult> {
  let aspekBaru = 0;
  let itemBaru = 0;
  let aspekSkip = 0;
  let itemSkip = 0;

  for (const a of aspekTemplateSeed) {
    let aspek = await prisma.aspekPenilaian.findFirst({
      where: { kegiatanId: null, kodeAspek: a.kodeAspek },
    });
    if (!aspek) {
      aspek = await prisma.aspekPenilaian.create({
        data: {
          kodeAspek: a.kodeAspek,
          namaAspek: a.namaAspek,
          deskripsi: a.deskripsi,
          bobot: a.bobot,
          isActive: true,
          kegiatanId: null,
        },
      });
      aspekBaru++;
    } else {
      aspekSkip++;
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
        itemBaru++;
      } else {
        itemSkip++;
      }
    }
  }

  const totalAktif = await prisma.aspekPenilaian.count({
    where: { kegiatanId: null, isActive: true },
  });

  return { aspekBaru, itemBaru, aspekSkip, itemSkip, totalAktif };
}
