import { PrismaClient } from '@prisma/client';
import { revokeLegacyMemberKtaCards } from '../src/modules/members/kta-card-revocation';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting legacy member KTA card revocation...');
  const result = await revokeLegacyMemberKtaCards(prisma);
  console.log('Legacy member KTA card revocation complete:', result);
}

main()
  .catch((error) => {
    console.error('Legacy member KTA card revocation failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
