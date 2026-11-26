import { MembersService } from './members.service';

type RecordMap = Record<string, any>;

function createInMemoryDelegate(seed: RecordMap = {}) {
  const store = new Map<string, RecordMap>(Object.entries(seed));
  let seq = 1;

  return {
    store,
    create: jest.fn(async ({ data }: { data: RecordMap }) => {
      const id = data.id ?? `id-${seq++}`;
      const record = { id, ...data };
      store.set(id, record);
      return { ...record };
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: RecordMap }) => {
      const existing = store.get(where.id);
      if (!existing) throw new Error(`Record not found: ${where.id}`);
      const updated = { ...existing, ...data };
      store.set(where.id, updated);
      return { ...updated };
    }),
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
      const record = store.get(where.id);
      return record ? { ...record } : null;
    }),
  };
}

describe('KTA pekerjaan/pelantikan field persistence', () => {
  it('maps admin edit fields into the Anggota update payload', async () => {
    const service = Object.create(MembersService.prototype) as MembersService & {
      beforeUpdate: (id: string, dto: RecordMap) => Promise<RecordMap>;
    };

    const data = await service.beforeUpdate('a1', {
      pekerjaan: 'Guru',
      pelantikan: '12 JULI 2020',
    });

    expect(data).toEqual(
      expect.objectContaining({ pekerjaan: 'Guru', pelantikan: '12 JULI 2020' }),
    );
  });

  it('persists pekerjaan and pelantikan on Anggota create/update read-back', async () => {
    const anggota = createInMemoryDelegate();

    const created = await anggota.create({
      data: {
        rantingId: 'r1',
        nomorAnggota: 'NRA-1',
        namaLengkap: 'Budi',
        jenisKelamin: 'L',
        pekerjaan: 'Guru',
        pelantikan: '12 JULI 2020',
      },
    });

    const createdReadBack = await anggota.findUnique({ where: { id: created.id } });
    expect(createdReadBack).toEqual(
      expect.objectContaining({
        id: created.id,
        pekerjaan: 'Guru',
        pelantikan: '12 JULI 2020',
      }),
    );

    await anggota.update({
      where: { id: created.id },
      data: {
        pekerjaan: 'Guru',
        pelantikan: '12 JULI 2020',
      },
    });

    const updatedReadBack = await anggota.findUnique({ where: { id: created.id } });
    expect(updatedReadBack).toEqual(
      expect.objectContaining({
        id: created.id,
        pekerjaan: 'Guru',
        pelantikan: '12 JULI 2020',
      }),
    );
  });

  it('persists pekerjaan and pelantikan on Klaim create/update read-back', async () => {
    const klaim = createInMemoryDelegate();

    const created = await klaim.create({
      data: {
        tipe: 'keanggotaan',
        pekerjaan: 'Guru',
        pelantikan: '12 JULI 2020',
      },
    });

    const createdReadBack = await klaim.findUnique({ where: { id: created.id } });
    expect(createdReadBack).toEqual(
      expect.objectContaining({
        id: created.id,
        pekerjaan: 'Guru',
        pelantikan: '12 JULI 2020',
      }),
    );

    await klaim.update({
      where: { id: created.id },
      data: {
        pekerjaan: 'Guru',
        pelantikan: '12 JULI 2020',
      },
    });

    const updatedReadBack = await klaim.findUnique({ where: { id: created.id } });
    expect(updatedReadBack).toEqual(
      expect.objectContaining({
        id: created.id,
        pekerjaan: 'Guru',
        pelantikan: '12 JULI 2020',
      }),
    );
  });
});
