import { EmailBlastService } from './email-blast.service';

// Jalankan dalam mode in-process (tanpa Redis) agar test deterministik
process.env.USE_BULLMQ = 'false';

describe('EmailBlastService', () => {
  let service: EmailBlastService;
  let notificationsSend: jest.Mock;
  let notifCreate: jest.Mock;
  let auditLog: jest.Mock;
  let loggerDebug: jest.Mock;

  const buildService = () =>
    new EmailBlastService(
      { notifikasi: { create: notifCreate } } as never,
      { send: notificationsSend } as never,
      auditLog.mock.calls.length >= 0 ? ({ log: auditLog } as never) : (undefined as never),
    );

  beforeEach(() => {
    jest.clearAllMocks();
    notificationsSend = jest.fn().mockResolvedValue(undefined);
    notifCreate = jest.fn().mockResolvedValue({});
    auditLog = jest.fn().mockResolvedValue(undefined);
    service = buildService();
    loggerDebug = jest.fn();
    Object.defineProperty(service, 'logger', {
      value: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: loggerDebug },
      writable: false,
    });
  });

  afterEach(async () => {
    await service.onApplicationShutdown();
  });

  it('mengantre item dan mengeksekusi via antrean in-process', async () => {
    const enqueued = await service.enqueue('reminder_iuran', '2026-09-29', [
      { userId: 'u1', judul: 'Halo', isi: 'Isi 1' },
      { userId: 'u2', judul: 'Halo', isi: 'Isi 2' },
    ]);
    expect(enqueued).toBe(2);

    // In-process adapter memproses async — tunggu antrean kosong
    await (service as unknown as { queue: { onIdle?: () => Promise<void> } }).queue.onIdle?.();

    expect(notificationsSend).toHaveBeenCalledTimes(2);
    expect(notificationsSend).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ userId: 'u1', judul: 'Halo', tipe: 'reminder_iuran' }),
    );
    expect(notifCreate).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('memakai jobId deterministik untuk anti-duplikasi', async () => {
    await service.enqueue('reminder_latihan', '2026-09-30', [
      { userId: 'u1', judul: 'J', isi: 'I' },
    ]);
    await service.enqueue('reminder_latihan', '2026-09-30', [
      { userId: 'u1', judul: 'J', isi: 'I' },
    ]);
    await (service as unknown as { queue: { onIdle?: () => Promise<void> } }).queue.onIdle?.();

    // In-process tidak menolak duplikat, tapi bentuk jobId harus stabil &
    // dapat diprediksi (di BullMQ, jobId sama = tidak dibuat ulang).
    expect(loggerDebug).toHaveBeenCalledWith(expect.stringContaining('email-blast:reminder_latihan:2026-09-30:u1:0'));
  });

  it('fallback ke notifikasi in-app bila NotificationsService gagal', async () => {
    notificationsSend.mockRejectedValue(new Error('FCM down'));

    await service.enqueue('umum', '2026-09-29', [{ userId: 'u3', judul: 'T', isi: 'I' }]);
    await (service as unknown as { queue: { onIdle?: () => Promise<void> } }).queue.onIdle?.();

    expect(notifCreate).toHaveBeenCalledWith({
      data: {
        userId: 'u3',
        tipe: 'umum',
        judul: 'T',
        isi: 'I',
      },
    });
  });

  it('mengembalikan 0 untuk daftar kosong tanpa menyentuh antrean', async () => {
    const enqueued = await service.enqueue('umum', '2026-09-29', []);
    expect(enqueued).toBe(0);
    expect(notificationsSend).not.toHaveBeenCalled();
  });

  it('mencatat audit saat job gagal permanen (setelah retry habis)', async () => {
    // Buat kegagalan TOTAL: fallback in-app juga gagal → onProcess throw →
    // adapter retry (2x) → tetap gagal → onFailed dipanggil.
    notificationsSend.mockRejectedValue(new Error('down'));
    notifCreate.mockRejectedValue(new Error('db down'));

    await service.enqueue('umum', '2026-09-29', [{ userId: 'u4', judul: 'T', isi: 'I' }]);

    // Tunggu sampai retries selesai (in-process: backoff singkat di test env)
    for (let i = 0; i < 50 && auditLog.mock.calls.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 100));
      await (service as unknown as { queue: { onIdle?: () => Promise<void> } }).queue.onIdle?.();
    }

    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EMAIL_BLAST_FAILED',
        entity: 'Notifikasi',
        entityId: expect.stringContaining('email-blast:umum:2026-09-29:u4:0'),
      }),
    );
  }, 20_000);
});
