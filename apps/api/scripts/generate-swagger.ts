import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { AppModule } from '../src/app.module';

/**
 * Generate swagger.json untuk kontrak API (CI contract job + production gate).
 *
 * Tidak menyentuh DB: PrismaService.onModuleInit melewati koneksi saat
 * SKIP_DB_CONNECT=true, jadi script ini aman dijalankan tanpa database.
 *
 * PENTING: jangan menulis "placeholder" saat CI/GITHUB_ACTIONS — contract
 * job membandingkan hasil regenerasi dengan file yang di-commit lewat
 * `git diff --exit-code`, jadi placeholder pasti gagal dan api.d.ts jadi
 * rusak. Biarkan generasi berjalan penuh.
 */
async function generateSwaggerSpec(): Promise<void> {
  // Lewati koneksi Prisma (lihat prisma.service.ts onModuleInit).
  process.env.SKIP_DB_CONNECT = 'true';

  // logger 'error', BUKAN false: NestFactory.create dengan logger false akan
  // memanggil ExceptionsZone -> process.exit(1) tanpa mencetak apa pun bila
  // boot gagal (mis. masalah DI) — error jadi tak terlihat di log CI.
  const app = await NestFactory.create(AppModule, { logger: ['error'] });

  try {
    const config = new DocumentBuilder()
      .setTitle('THS-THM API')
      .setDescription('API Documentation for THS-THM System Manajemen')
      .setVersion('1.0')
      .addBearerAuth()
      .addServer('http://localhost:3001', 'Development')
      .addServer('https://ths-thm-api.onrender.com', 'Production')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    writeFileSync('./swagger.json', JSON.stringify(document, null, 2));

    console.log('swagger.json generated successfully');
  } finally {
    await app.close();
  }
}

generateSwaggerSpec().catch((err) => {
  console.error('Error generating swagger:', err);
  process.exit(1);
});
