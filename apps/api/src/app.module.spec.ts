/**
 * Anti-regression: resolve SELURUH graph DI AppModule.
 *
 * 59 spec lain memakai Test.createTestingModule({ imports: [ModulTunggal] })
 * sehingga wiring lintas-module tak pernah diuji. Bug nyata yang lolos karena
 * ini: RolesGuard menyuntik PermissionsService tetapi PermissionsModule tidak
 * @Global -> "Nest can't resolve dependencies of the RolesGuard", gagal boot
 * di CI (job contract & Production Deploy) selama belasan commit debugging
 * karena generate-swagger.ts memakai logger:false sehingga ExceptionsZone
 * keluar senyap dengan exit 1.
 *
 * Boot dijalankan sebagai child process (scripts/boot-check.ts), BUKAN di
 * worker jest: boot yang gagal meninggalkan handle terbuka sehingga worker
 * tidak pernah keluar — regresi akan hang alih-alih gagal cepat. Dengan child
 * process, kegagalan = exit code non-zero + stack trace yang terbaca.
 *
 * Env dummy diset di sini (jest tidak memuat .env: DATABASE_URL & JWT
 * undefined) dan di-inherit oleh child-nya.
 */
process.env.SKIP_DB_CONNECT = 'true';
process.env.USE_BULLMQ = 'false';
process.env.CRON_DISTRIBUTED_LOCK = 'false';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://ci:ci@localhost:5432/ci_dummy';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'app-module-spec-jwt-secret-0123456789abcdef0123';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'app-module-spec-jwt-refresh-0123456789abcdef';

import { spawnSync } from 'child_process';
import { join } from 'path';

describe('AppModule (full DI graph)', () => {
  it('meresolve seluruh provider guard & controller tanpa error DI', () => {
    const script = join(__dirname, '..', 'scripts', 'boot-check.ts');

    const result = spawnSync(
      process.execPath,
      ['-r', 'ts-node/register/transpile-only', script],
      {
        cwd: join(__dirname, '..'),
        env: process.env,
        encoding: 'utf8',
        timeout: 120_000,
      },
    );

    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

    if (result.status !== 0) {
      // Cetak output child penuh agar penyebabnya (mis. "Nest can't resolve
      // dependencies of the RolesGuard") langsung terlihat di log jest.
      // eslint-disable-next-line no-console
      console.error(output);
    }

    if (result.error) {
      throw result.error;
    }

    expect(result.signal).toBeNull();
    expect(result.status).toBe(0);
    expect(output).toContain('boot-check OK');
  }, 150_000);
});
