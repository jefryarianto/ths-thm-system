import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

/**
 * Boot-check: resolusi penuh graph DI AppModule tanpa DB dan tanpa listener.
 *
 * Dipanggil sebagai CHILD PROCESS oleh src/app.module.spec.ts (jest) — bukan
 * di dalam worker jest. Alasannya: bila boot gagal (mis. guard tanpa
 * dependensi), provider yang sempat ter-instance meninggalkan handle terbuka
 * sehingga worker jest tidak pernah keluar (regresi jadi hang, bukan gagal).
 * Di child process, kegagalan keluar sebagai exit code 1 + stack trace yang
 * terbaca, dan worker jest tetap bersih.
 *
 * Sama dengan jalur produksi: NestFactory.create me-resolve seluruh provider
 * termasuk APP_GUARD — di sinilah bug PermissionsService tanpa @Global dulu
 * meledak (lihat generate-swagger.ts yang saat itu logger:false sehingga
 * ExceptionsZone exit senyap tanpa pesan).
 */
async function bootCheck(): Promise<void> {
  // Tanpa DB: PrismaService.onModuleInit melewati $connect (prisma.service.ts),
  // PermissionsService melewati cache warm-up (permissions.service.ts).
  process.env.SKIP_DB_CONNECT = 'true';

  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  await app.close();
  console.log('boot-check OK: AppModule resolved tanpa error DI');
}

bootCheck().catch((err) => {
  console.error('boot-check GAGAL:', err);
  process.exit(1);
});
