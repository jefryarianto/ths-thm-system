import { Prisma } from '@prisma/client';

describe('KTA pekerjaan/pelantikan field persistence', () => {
  it('Anggota create/update data includes pekerjaan and pelantikan', () => {
    const createData: Prisma.AnggotaUncheckedCreateInput = {
      rantingId: 'r1',
      nomorAnggota: 'NRA-1',
      namaLengkap: 'Budi',
      jenisKelamin: 'L',
      pekerjaan: 'Guru',
      pelantikan: '12 JULI 2020',
    };

    const updateData: Prisma.AnggotaUncheckedUpdateInput = {
      pekerjaan: 'Guru',
      pelantikan: '12 JULI 2020',
    };

    expect(createData.pekerjaan).toBe('Guru');
    expect(createData.pelantikan).toBe('12 JULI 2020');
    expect(updateData.pekerjaan).toBe('Guru');
    expect(updateData.pelantikan).toBe('12 JULI 2020');
  });

  it('Klaim create/update data includes pekerjaan and pelantikan', () => {
    const createData: Prisma.KlaimUncheckedCreateInput = {
      tipe: 'keanggotaan',
      pekerjaan: 'Guru',
      pelantikan: '12 JULI 2020',
    };

    const updateData: Prisma.KlaimUncheckedUpdateInput = {
      pekerjaan: 'Guru',
      pelantikan: '12 JULI 2020',
    };

    expect(createData.pekerjaan).toBe('Guru');
    expect(createData.pelantikan).toBe('12 JULI 2020');
    expect(updateData.pekerjaan).toBe('Guru');
    expect(updateData.pelantikan).toBe('12 JULI 2020');
  });
});
