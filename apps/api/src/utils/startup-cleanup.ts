import { PrismaClient } from '@prisma/client';

export async function cleanupStaleNotifications(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;

  const prisma = new PrismaClient();

  try {
    const staleNotifs = await prisma.notifikasi.findMany({
      where: { tipe: 'data_incomplete' },
      select: { id: true, userId: true },
    });

    if (staleNotifs.length === 0) return;

    const anggotaIds = [...new Set(staleNotifs.map((n) => n.userId))];
    const members = await prisma.anggota.findMany({
      where: { id: { in: anggotaIds } },
      select: {
        id: true,
        namaLengkap: true,
        tempatLahir: true,
        tanggalLahir: true,
        alamat: true,
        noHp: true,
        email: true,
      },
    });

    const completeIds = new Set(
      members
        .filter(
          (m) =>
            m.namaLengkap &&
            m.tempatLahir &&
            m.tanggalLahir &&
            m.alamat &&
            m.noHp &&
            m.email,
        )
        .map((m) => m.id),
    );

    const toDelete = staleNotifs.filter((n) => completeIds.has(n.userId));

    if (toDelete.length > 0) {
      await prisma.notifikasi.deleteMany({
        where: { id: { in: toDelete.map((n) => n.id) } },
      });
      console.log(`🧹 Cleaned up ${toDelete.length} stale data_incomplete notifications`);
    }
  } catch (err) {
    console.warn('⚠️ Startup notification cleanup skipped:', (err as Error).message);
  } finally {
    await prisma.$disconnect();
  }
}