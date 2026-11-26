import { KtaApplicationController } from './kta-application.controller';
import { KtaApplicationService } from './kta-application.service';
import { CreateKtaDto } from './dto/create-kta.dto';

const submitter = { id: 'u1', role: 'anggota' };
const adminSubmitter = { id: 'u2', role: 'admin_ranting' };

function makeMember(id = 'm1', namaLengkap = 'Budi Santoso') {
  return {
    id,
    rantingId: 'r1',
    nomorAnggota: 'NRA-1',
    namaLengkap,
    jenisKelamin: 'L',
    tempatLahir: 'Bandung',
    tanggalLahir: new Date('1990-01-02T00:00:00.000Z'),
    alamat: 'Jl. A',
    noHp: '081234567890',
    email: 'budi@test.com',
    fotoPath: null,
    statusKeanggotaan: 'aktif',
    tingkat: 'putih',
    tempatDadar: null,
    tahunDadar: null,
    pekerjaan: null,
    ranting: {
      id: 'r1',
      nama: 'Ranting A',
      wilayah: {
        id: 'w1',
        nama: 'Wilayah B',
        distrik: { id: 'd1', nama: 'Distrik C', alamat: 'Jl. D' },
      },
    },
  };
}

function makeHarness(members = [makeMember()]) {
  const byId = new Map(members.map((member) => [member.id, member]));
  let createdCount = 0;
  const create = jest.fn(async ({ data }: any) => ({ id: `a${++createdCount}`, ...data }));
  const tx = {
    ktaApplication: {
      create,
      findUnique: jest.fn().mockResolvedValue(null),
    },
    ktaAppHistory: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    anggota: {
      findUnique: jest.fn(async ({ where }: any) => byId.get(where.id) ?? null),
      findFirst: jest.fn(async ({ where }: any) =>
        Array.from(byId.values()).find((member: any) => member.email === where.email) ?? null,
      ),
      update: jest.fn(async ({ where, data }: any) => {
        const member = byId.get(where.id);
        if (member) Object.assign(member, data);
        return member;
      }),
    },
    ktaApplication: { findFirst: jest.fn().mockResolvedValue(null) },
    dokumen: { findFirst: jest.fn().mockResolvedValue(null) },
    ktaBatch: { create: jest.fn().mockResolvedValue({ id: 'b1' }) },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(async (callback: any) => callback(tx)),
  };
  const scopeHelper = { hasAccessToResourceAsync: jest.fn().mockResolvedValue(true) };
  const service = new KtaApplicationService(prisma as any, scopeHelper as any, {} as any);
  const snapshotOf = (index = 0) => create.mock.calls[index][0].data.submittedSnapshot;
  return { service, prisma, scopeHelper, create, snapshotOf };
}

const payload = {
  namaLengkap: 'Budi Dari DTO',
  jenisKelamin: 'L' as const,
  noHp: '081234567890',
} as CreateKtaDto;

describe('KTA submit snapshot', () => {
  it('submit dengan payload menyimpan snapshot v1 lengkap', async () => {
    const { service, snapshotOf } = makeHarness();

    await service.submit('m1', submitter, undefined, payload);

    const snapshot = snapshotOf();
    expect(snapshot.version).toBe(1);
    expect(snapshot.submittedAt).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
    expect(snapshot.submittedBy).toEqual({ id: 'u1', role: 'anggota' });
    expect(snapshot.payload).toEqual(expect.objectContaining({ namaLengkap: 'Budi Dari DTO' }));
    expect(snapshot.anggota).toEqual(
      expect.objectContaining({
        namaLengkap: 'Budi Santoso',
        tanggalLahir: '1990-01-02T00:00:00.000Z',
        ranting: { id: 'r1', nama: 'Ranting A' },
        wilayah: { id: 'w1', nama: 'Wilayah B' },
        distrik: { id: 'd1', nama: 'Distrik C' },
        alamatDistrik: 'Jl. D',
      }),
    );
    expect(snapshot.missingFields).toEqual([]);
  });

  it('submit Self tanpa payload menyimpan snapshot dengan payload null', async () => {
    const { service, snapshotOf } = makeHarness();

    await service.submitSelf('budi@test.com', submitter);

    expect(snapshotOf().payload).toBeNull();
    expect(snapshotOf().anggota.namaLengkap).toBe('Budi Santoso');
  });

  it('submit Self dengan payload menyimpan payload tersebut', async () => {
    const { service, snapshotOf } = makeHarness();

    await service.submitSelf('budi@test.com', submitter, payload);

    expect(snapshotOf().payload).toEqual(expect.objectContaining({ namaLengkap: 'Budi Dari DTO' }));
  });

  it('submit Bulk menyimpan satu snapshot per aplikasi dengan payload null', async () => {
    const { service, snapshotOf } = makeHarness([
      makeMember(),
      makeMember('m2', 'Siti Aminah'),
    ]);

    await service.submitBulk(['m1', 'm2'], adminSubmitter, 'Batch A');

    expect(snapshotOf(0).payload).toBeNull();
    expect(snapshotOf(0).anggota.namaLengkap).toBe('Budi Santoso');
    expect(snapshotOf(1).payload).toBeNull();
    expect(snapshotOf(1).anggota.namaLengkap).toBe('Siti Aminah');
    expect(snapshotOf(1).submittedBy).toEqual({ id: 'u2', role: 'admin_ranting' });
  });

  it('snapshot tidak berubah setelah data anggota diubah', async () => {
    const { service, prisma, snapshotOf } = makeHarness();
    const localPayload = { ...payload };

    await service.submit('m1', submitter, undefined, localPayload);
    const snapshot = snapshotOf();
    await prisma.anggota.update({
      where: { id: 'm1' },
      data: { namaLengkap: 'Nama Baru' },
    });
    localPayload.namaLengkap = 'Payload Baru';

    expect(snapshot.anggota.namaLengkap).toBe('Budi Santoso');
    expect(snapshot.payload.namaLengkap).toBe('Budi Dari DTO');
    expect(snapshot.submittedAt).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
  });

  it('argumen ketiga submit tetap dipakai sebagai scope', async () => {
    const { service, scopeHelper, snapshotOf } = makeHarness();
    const scope = { role: 'admin_ranting', rantingId: 'r1' } as any;

    await service.submit('m1', submitter, scope);

    expect(scopeHelper.hasAccessToResourceAsync).toHaveBeenCalledWith(
      expect.anything(),
      scope,
      'r1',
    );
    expect(snapshotOf().payload).toBeNull();
  });
});

describe('KTA controller submit body', () => {
  it('create meneruskan DTO ke submitSelf sedangkan /me tetap tanpa body', async () => {
    const submitSelf = jest.fn().mockResolvedValue({ id: 'a1' });
    const controller = new KtaApplicationController(
      { submitSelf } as any,
      {} as any,
      {} as any,
    );
    const user = { id: 'u1', role: 'anggota', email: 'budi@test.com' } as any;

    await controller.create(user, payload);
    expect(submitSelf).toHaveBeenCalledWith('budi@test.com', submitter, payload);

    await controller.createMyApplication(user);
    expect(submitSelf).toHaveBeenLastCalledWith('budi@test.com', submitter);
  });
});
