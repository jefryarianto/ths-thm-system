import { seedAspekTemplate, aspekTemplateSeed, SeedAspekTemplatePrisma } from './seed-aspek-template';

/**
 * Mock prisma in-memory yang meniru perilaku unik:
 * - aspekPenilaian unik per (kegiatanId, kodeAspek)
 * - itemPenilaian unik per (aspekId, kodeItem)
 * Sehingga menjalankan seed dua kali terbukti tidak menduplikasi data.
 */
function createMockPrisma(): SeedAspekTemplatePrisma & { _dump(): { aspek: unknown[]; item: unknown[] } } {
  const aspekRows: Array<{ id: string; kegiatanId: null; kodeAspek: string; isActive: boolean }> = [];
  const itemRows: Array<{ aspekId: string; kodeItem: string; namaItem: string; urutan: number }> = [];
  let nextId = 1;

  return {
    aspekPenilaian: {
      findFirst: async ({ where }) =>
        aspekRows.find((r) => r.kegiatanId === where.kegiatanId && r.kodeAspek === where.kodeAspek) ?? null,
      create: async ({ data }) => {
        if (aspekRows.some((r) => r.kodeAspek === data.kodeAspek)) {
          const err = new Error('Unique constraint failed') as Error & { code?: string };
          err.code = 'P2002';
          throw err;
        }
        const row = { id: `aspek-${nextId++}`, ...data };
        aspekRows.push(row);
        return row;
      },
      count: async ({ where }) => aspekRows.filter((r) => r.isActive === where.isActive).length,
    },
    itemPenilaian: {
      findFirst: async ({ where }) =>
        itemRows.find((r) => r.aspekId === where.aspekId && r.kodeItem === where.kodeItem) ?? null,
      create: async ({ data }) => {
        itemRows.push({ ...data });
        return data;
      },
    },
    _dump: () => ({ aspek: [...aspekRows], item: [...itemRows] }),
  };
}

describe('seedAspekTemplate', () => {
  it('seed pertama membuat seluruh aspek & item template', async () => {
    const prisma = createMockPrisma();

    const r = await seedAspekTemplate(prisma);

    expect(r.aspekBaru).toBe(aspekTemplateSeed.length);
    expect(r.aspekSkip).toBe(0);
    expect(r.itemBaru).toBe(aspekTemplateSeed.reduce((n, a) => n + a.items.length, 0));
    expect(r.itemSkip).toBe(0);
    expect(r.totalAktif).toBe(aspekTemplateSeed.length);
  });

  it('IDEMPOTEN: run kedua tidak menduplikasi apa pun', async () => {
    const prisma = createMockPrisma();

    const first = await seedAspekTemplate(prisma);
    const second = await seedAspekTemplate(prisma);

    expect(second.aspekBaru).toBe(0);
    expect(second.itemBaru).toBe(0);
    expect(second.aspekSkip).toBe(first.aspekBaru);
    expect(second.itemSkip).toBe(first.itemBaru);
    expect(second.totalAktif).toBe(first.totalAktif);

    const dump = prisma._dump();
    expect(dump.aspek).toHaveLength(aspekTemplateSeed.length);
    expect(dump.item).toHaveLength(aspekTemplateSeed.reduce((n, a) => n + a.items.length, 0));
  });

  it('IDEMPOTEN: run tiga kali tetap konsisten', async () => {
    const prisma = createMockPrisma();

    await seedAspekTemplate(prisma);
    await seedAspekTemplate(prisma);
    const third = await seedAspekTemplate(prisma);

    expect(third.aspekBaru).toBe(0);
    expect(third.itemBaru).toBe(0);
    const dump = prisma._dump();
    expect(dump.aspek).toHaveLength(aspekTemplateSeed.length);
    expect(dump.item).toHaveLength(aspekTemplateSeed.reduce((n, a) => n + a.items.length, 0));
  });

  it('tidak menimpa penyesuaian manual admin pada data yang sudah ada', async () => {
    const prisma = createMockPrisma();

    await seedAspekTemplate(prisma);
    // Simulasi admin mengubah nama aspek template secara manual
    const dump1 = prisma._dump();
    (dump1.aspek[0] as { namaAspek?: string }).namaAspek = 'Diubah Admin';

    await seedAspekTemplate(prisma);

    const dump2 = prisma._dump();
    expect((dump2.aspek[0] as { namaAspek?: string }).namaAspek).toBe('Diubah Admin');
  });

  it('total bobot aspek template = 100', () => {
    const total = aspekTemplateSeed.reduce((n, a) => n + a.bobot, 0);
    expect(total).toBe(100);
    for (const a of aspekTemplateSeed) {
      const itemTotal = a.items.reduce((n, i) => n + i.bobot, 0);
      expect(itemTotal).toBe(100);
    }
  });
});
