import { Prisma, PrismaClient } from '@prisma/client';

type RevokeResult = {
  documentsRevoked: number;
  digitalQrsRevoked: number;
  datesCleared: number;
};

type KtaCardQr = { id: string; source: string; isValid: boolean };
type KtaCardDocument = {
  id: string;
  anggotaId: string;
  status: string;
  qrValidations: KtaCardQr[];
};

type PrismaLike = PrismaClient | Prisma.TransactionClient;

const REVOKE_REASON = 'KTA digital lama dicabut; penerbitan hanya oleh admin';

async function revokeInClient(tx: PrismaLike): Promise<RevokeResult> {
  const documents = (await tx.dokumen.findMany({
    where: {
      tipe: 'kartu_anggota',
      qrValidations: { some: { source: 'digital', isValid: true } },
    },
    include: { qrValidations: true },
  })) as unknown as KtaCardDocument[];

  const digitalQrIds = documents.flatMap((doc) =>
    doc.qrValidations
      .filter((qr) => qr.source === 'digital' && qr.isValid)
      .map((qr) => qr.id),
  );

  const hasValidPrintedQr = (doc: KtaCardDocument) =>
    doc.qrValidations.some((qr) => qr.source === 'printed' && qr.isValid);

  const documentsToRevoke = documents.filter(
    (doc) => doc.status !== 'revoked' && !hasValidPrintedQr(doc),
  );

  const retainedMemberIds = new Set(
    documents.filter((doc) => doc.status !== 'revoked' && hasValidPrintedQr(doc)).map((doc) => doc.anggotaId),
  );

  const revokedMemberIds = new Set(documentsToRevoke.map((doc) => doc.anggotaId));
  const memberIdsToClear = [...revokedMemberIds].filter((id) => !retainedMemberIds.has(id));

  const [{ count: digitalQrsRevoked }, { count: documentsRevoked }, { count: datesCleared }] =
    await Promise.all([
      digitalQrIds.length
        ? tx.qRValidation.updateMany({
            where: { id: { in: digitalQrIds }, isValid: true },
            data: { isValid: false, reason: REVOKE_REASON },
          })
        : Promise.resolve({ count: 0 }),
      documentsToRevoke.length
        ? tx.dokumen.updateMany({
            where: {
              id: { in: documentsToRevoke.map((doc) => doc.id) },
              status: { not: 'revoked' },
            },
            data: { status: 'revoked' },
          })
        : Promise.resolve({ count: 0 }),
      memberIdsToClear.length
        ? tx.anggota.updateMany({
            where: {
              id: { in: memberIdsToClear },
              OR: [
                { tanggalTerbit: { not: null } },
                { tanggalBerlakuSampai: { not: null } },
              ],
            },
            data: { tanggalTerbit: null, tanggalBerlakuSampai: null },
          })
        : Promise.resolve({ count: 0 }),
    ]);

  return { documentsRevoked, digitalQrsRevoked, datesCleared };
}

export async function revokeLegacyMemberKtaCards(prisma: PrismaLike): Promise<RevokeResult> {
  if ('$transaction' in prisma && typeof prisma.$transaction === 'function') {
    return prisma.$transaction((tx) => revokeInClient(tx));
  }
  return revokeInClient(prisma);
}
