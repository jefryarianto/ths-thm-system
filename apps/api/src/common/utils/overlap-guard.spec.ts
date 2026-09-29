import { createOverlapGuard } from './overlap-guard';

describe('createOverlapGuard', () => {
  it('menjalankan fn dan mengembalikan hasilnya', async () => {
    const guard = createOverlapGuard({ warn: jest.fn() });
    await expect(guard('tugas', async () => 42)).resolves.toBe(42);
  });

  it('melewatkan eksekusi kedua selama yang pertama masih berjalan', async () => {
    const warn = jest.fn();
    const guard = createOverlapGuard({ warn });
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));

    const first = guard('cron-berat', async () => {
      await gate;
      return 'pertama';
    });
    const second = await guard('cron-berat', async () => 'kedua');

    expect(second).toBeUndefined(); // dilewati
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('cron-berat'));

    release();
    await expect(first).resolves.toBe('pertama');
  });

  it('melepas lock setelah eksekusi selesai (boleh berjalan lagi)', async () => {
    const guard = createOverlapGuard({ warn: jest.fn() });
    await guard('tugas', async () => undefined);
    await expect(guard('tugas', async () => 'lagi')).resolves.toBe('lagi');
  });

  it('melepas lock walau fn melempar error', async () => {
    const guard = createOverlapGuard({ warn: jest.fn() });
    await expect(guard('gagal', async () => {
      throw new Error('boom');
    })).rejects.toThrow('boom');

    // Lock harus sudah lepas — eksekusi berikutnya jalan normal
    await expect(guard('gagal', async () => 'pulih')).resolves.toBe('pulih');
  });

  it('nama pekerjaan berbeda tidak saling mengunci', async () => {
    const guard = createOverlapGuard({ warn: jest.fn() });
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));

    const a = guard('a', async () => {
      await gate;
      return 'a';
    });
    await expect(guard('b', async () => 'b')).resolves.toBe('b');

    release();
    await expect(a).resolves.toBe('a');
  });
});
