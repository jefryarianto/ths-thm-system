import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, createReadStream, createWriteStream } from 'fs';
import { join } from 'path';
import { createGzip } from 'zlib';

const execFileAsync = promisify(execFile);

export interface BackupFileInfo {
  name: string;
  sizeBytes: number;
  createdAt: string;
}

interface PgConnection {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
}

function parseDatabaseUrl(url?: string): PgConnection | null {
  if (!url) return null;
  const match = /^postgres(?:ql)?:\/\/([^:]*):?([^@]*)@([^:]+):?(\d*)\/(.+)$/.exec(url);
  if (!match) return null;
  return {
    user: decodeURIComponent(match[1]),
    password: match[2] ? decodeURIComponent(match[2]) : undefined,
    host: match[3],
    port: parseInt(match[4] || '5432', 10),
    database: decodeURIComponent(match[5]),
  };
}

/**
 * Backup database PostgreSQL via `pg_dump` + gzip ke direktori `BACKUP_DIR`.
 * - Cron harian (jam konfigurabel, default 03:00)
 * - Retensi N backup terakhir (default 7)
 * - Best-effort: bila pg_dump tidak tersedia, log warning, tidak crash.
 */
@Injectable()
export class DbBackupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DbBackupService.name);
  private readonly backupDir = process.env.BACKUP_DIR || './backups';
  private readonly keepCount = Math.max(1, parseInt(process.env.BACKUP_KEEP || '7', 10) || 7);
  private readonly pgDumpPath =
    process.env.PG_DUMP_PATH ||
    (process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump');

  constructor() {}

  async onApplicationBootstrap(): Promise<void> {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }
    await this.cleanupOldBackups().catch((err) => {
      this.logger.warn(`Backup dir init/cleanup gagal: ${(err as Error).message}`);
    });
  }

  @Cron('0 3 * * *', { name: 'db-backup' })
  async scheduledBackup(): Promise<void> {
    if (process.env.BACKUP_ENABLED === 'false') return;
    await this.runBackup();
  }

  async runBackup(): Promise<BackupFileInfo> {
    const conn = parseDatabaseUrl(process.env.DATABASE_URL);
    if (!conn) {
      throw new Error('DATABASE_URL tidak valid — backup dibatalkan');
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rawFile = join(this.backupDir, `backup-${stamp}.sql`);
    const gzFile = `${rawFile}.gz`;

    try {
      const args = [
        '--no-owner',
        '--no-privileges',
        '--host', conn.host,
        '--port', String(conn.port),
        '--username', conn.user,
        '--dbname', conn.database,
        '--file', rawFile,
      ];
      if (conn.password) {
        await execFileAsync(this.pgDumpPath, args, {
          env: { ...process.env, PGPASSWORD: conn.password },
          maxBuffer: 512 * 1024 * 1024,
        });
      } else {
        await execFileAsync(this.pgDumpPath, args, { maxBuffer: 512 * 1024 * 1024 });
      }

      await this.gzipFile(rawFile, gzFile);
      unlinkSync(rawFile);

      await this.cleanupOldBackups();
      return await this.getBackupInfo(gzFile);
    } catch (err) {
      // Bersihkan file parsial bila ada
      if (existsSync(rawFile)) {
        try {
          unlinkSync(rawFile);
        } catch {
          /* ignore */
        }
      }
      if (existsSync(gzFile)) {
        try {
          unlinkSync(gzFile);
        } catch {
          /* ignore */
        }
      }
      throw new Error(
        `Backup gagal (pastikan pg_dump tersedia): ${(err as Error).message}`,
      );
    }
  }

  listBackups(): BackupFileInfo[] {
    if (!existsSync(this.backupDir)) return [];
    return readdirSync(this.backupDir)
      .filter((f) => f.endsWith('.gz'))
      .map((f) => {
        try {
          return this.getBackupInfo(join(this.backupDir, f));
        } catch {
          return null;
        }
      })
      .filter((x): x is BackupFileInfo => x !== null)
      .sort((a, b) => b.name.localeCompare(a.name));
  }

  deleteBackup(fileName: string): boolean {
    if (/\.\.|[/\\]/.test(fileName)) {
      throw new Error('Nama file tidak valid');
    }
    const fullPath = join(this.backupDir, fileName);
    if (!existsSync(fullPath)) return false;
    unlinkSync(fullPath);
    return true;
  }

  getBackupPath(fileName: string): string {
    if (/\.\.|[/\\]/.test(fileName)) {
      throw new Error('Nama file tidak valid');
    }
    const fullPath = join(this.backupDir, fileName);
    if (!existsSync(fullPath)) throw new Error('File backup tidak ditemukan');
    return fullPath;
  }

  private async gzipFile(src: string, dest: string): Promise<void> {
    const read = createReadStream(src);
    const write = createWriteStream(dest);
    const gz = createGzip();
    read.pipe(gz).pipe(write);
    await new Promise<void>((resolve, reject) => {
      write.on('finish', () => resolve());
      write.on('error', reject);
      read.on('error', reject);
      gz.on('error', reject);
    });
  }

  private async cleanupOldBackups(): Promise<void> {
    const backups = this.listBackups();
    const excess = backups.slice(this.keepCount);
    for (const b of excess) {
      try {
        unlinkSync(join(this.backupDir, b.name));
      } catch {
        /* ignore */
      }
    }
    if (excess.length > 0) {
      this.logger.log(`Retensi backup: hapus ${excess.length} file lama (maks ${this.keepCount})`);
    }
  }

  private getBackupInfo(filePath: string): BackupFileInfo {
    const stat = statSync(filePath);
    return {
      name: filePath.split(/[/\\]/).pop() as string,
      sizeBytes: stat.size,
      createdAt: stat.mtime.toISOString(),
    };
  }
}