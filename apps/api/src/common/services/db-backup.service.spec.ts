import { Test } from '@nestjs/testing';
import { DbBackupService } from './db-backup.service';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('DbBackupService', () => {
  let service: DbBackupService;
  let backupDir: string;

  beforeEach(async () => {
    backupDir = mkdtempSync(join(tmpdir(), 'db-backup-'));
    process.env.BACKUP_DIR = backupDir;
    process.env.BACKUP_KEEP = '2';

    const module = await Test.createTestingModule({
      providers: [DbBackupService],
    }).compile();

    service = module.get(DbBackupService);
    await service.onApplicationBootstrap();
  });

  afterEach(() => {
    delete process.env.BACKUP_DIR;
    delete process.env.BACKUP_KEEP;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create backup dir on bootstrap', () => {
    expect(existsSync(backupDir)).toBe(true);
  });

  it('should list backup files sorted newest-first', async () => {
    writeFileSync(join(backupDir, 'backup-2026-01-02T00-00-00-000Z.sql.gz'), 'x');
    writeFileSync(join(backupDir, 'backup-2026-01-01T00-00-00-000Z.sql.gz'), 'xx');
    writeFileSync(join(backupDir, 'not-a-backup.txt'), 'y');

    const backups = service.listBackups();
    expect(backups).toHaveLength(2);
    expect(backups[0].name).toBe('backup-2026-01-02T00-00-00-000Z.sql.gz');
    expect(backups[0].sizeBytes).toBe(1);
  });

  it('should delete a backup with valid filename', () => {
    writeFileSync(join(backupDir, 'backup-a.sql.gz'), 'x');
    expect(service.deleteBackup('backup-a.sql.gz')).toBe(true);
    expect(existsSync(join(backupDir, 'backup-a.sql.gz'))).toBe(false);
    expect(service.deleteBackup('backup-a.sql.gz')).toBe(false);
  });

  it('should reject path traversal filenames', () => {
    expect(() => service.deleteBackup('../../etc/passwd')).toThrow(/nama file tidak valid/i);
    expect(() => service.getBackupPath('..\\secret.gz')).toThrow(/nama file tidak valid/i);
  });

  it('should fail gracefully when pg_dump is unavailable', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/thsthm';
    process.env.PG_DUMP_PATH = 'pg_dump_does_not_exist_xyz';
    await expect(service.runBackup()).rejects.toThrow(/Backup gagal/);
    // Tidak ada file parsial tertinggal
    expect(service.listBackups()).toHaveLength(0);
  });
});