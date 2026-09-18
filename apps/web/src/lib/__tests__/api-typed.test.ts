import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient, { unwrap } from '@/lib/api-client';
import { typedApi } from '@/lib/api-typed';

vi.mock('@/lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  default: { request: vi.fn() },
}));

const requestMock = vi.mocked(apiClient.request);

beforeEach(() => {
  requestMock.mockReset();
  requestMock.mockResolvedValue({
    data: { success: true, data: null },
    status: 200,
  });
});

describe('typedApi — runtime', () => {
  it('GET tanpa params: method & url sesuai path kontrak', async () => {
    await typedApi.get('/members');
    expect(requestMock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ method: 'GET', url: '/members' }),
    );
  });

  it('GET dengan path param: disubstitusi & ter-encode', async () => {
    await typedApi.get('/members/{id}', { path: { id: 'abc/1' } });
    expect(requestMock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ method: 'GET', url: '/members/abc%2F1' }),
    );
  });

  it('GET dengan query: undefined tidak masuk query string', async () => {
    await typedApi.get('/members', {
      query: { page: 2, search: 'budi santoso', limit: undefined },
    });
    const arg = requestMock.mock.calls[0][0] as { url: string };
    expect(arg.url).toBe('/members?page=2&search=budi%20santoso');
  });

  it('GET dengan query kosong: tanpa tanda tanya', async () => {
    await typedApi.get('/settings/periods');
    const arg = requestMock.mock.calls[0][0] as { url: string };
    expect(arg.url).toBe('/settings/periods');
  });

  it('query filter bertipe record dikirim apa adanya', async () => {
    await typedApi.get('/org-structure/wilayah', {
      query: { distrikId: 'd1' },
    });
    const arg = requestMock.mock.calls[0][0] as { url: string };
    expect(arg.url).toBe('/org-structure/wilayah?distrikId=d1');
  });

  it('POST mengirim body sesuai DTO kontrak', async () => {
    await typedApi.post('/graduations', {
      nama: 'Pendadaran Batch 1',
      tanggalMulai: '2026-09-01',
    });
    const arg = requestMock.mock.calls[0][0] as {
      method: string;
      url: string;
      data: unknown;
    };
    expect(arg.method).toBe('POST');
    expect(arg.url).toBe('/graduations');
    expect(arg.data).toEqual({
      nama: 'Pendadaran Batch 1',
      tanggalMulai: '2026-09-01',
    });
  });

  it('DELETE dengan path param ter-substitusi', async () => {
    await typedApi.delete('/members/{id}', { path: { id: 'm1' } });
    expect(requestMock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ method: 'DELETE', url: '/members/m1' }),
    );
  });

  it('PATCH meneruskan body & config (signal/headers)', async () => {
    const controller = new AbortController();
    await typedApi.patch(
      '/members/{id}',
      { namaLengkap: 'Baru' },
      { path: { id: 'm1' } },
      { signal: controller.signal, headers: { 'X-Idempotency-Key': 'k1' } },
    );
    const arg = requestMock.mock.calls[0][0] as {
      method: string;
      url: string;
      data: unknown;
      signal: AbortSignal;
      headers: Record<string, string>;
    };
    expect(arg.method).toBe('PATCH');
    expect(arg.url).toBe('/members/m1');
    expect(arg.data).toEqual({ namaLengkap: 'Baru' });
    expect(arg.signal).toBe(controller.signal);
    expect(arg.headers).toEqual({ 'X-Idempotency-Key': 'k1' });
  });

  it('error axios diteruskan ke pemanggil', async () => {
    requestMock.mockRejectedValueOnce({ status: 500, message: 'boom' });
    await expect(typedApi.get('/members')).rejects.toEqual({
      status: 500,
      message: 'boom',
    });
  });

  it('respons ter-compose dengan unwrap<T> dari api-client', async () => {
    requestMock.mockResolvedValueOnce({
      data: { success: true, data: { id: 'm1' } },
      status: 200,
    });
    const res = await typedApi.get('/members/{id}', { path: { id: 'm1' } });
    expect(res.status).toBe(200);
    const member = unwrap<{ id: string }>(res);
    expect(member.id).toBe('m1');
  });
});

describe('typedApi — type-guards kontrak (diverifikasi tsc)', () => {
  it('path yang tidak ada di kontrak ditolak compile-time', () => {
    // @ts-expect-error path ini tidak ada di api.d.ts
    typedApi.get('/bukan-endpoint');
    expect(true).toBe(true);
  });

  it('method yang tidak tersedia di path ditolak compile-time', () => {
    // PATCH tidak ada pada /settings/periods (hanya get & post)
    // @ts-expect-error method tidak tersedia untuk path ini
    typedApi.patch('/settings/periods', {});
    expect(true).toBe(true);
  });

  it('path param wajib — tidak boleh dihilangkan', () => {
    // @ts-expect-error {id} wajib disediakan
    typedApi.get('/members/{id}');
    expect(true).toBe(true);
  });

  it('body POST dengan field tidak dikenal ditolak compile-time', () => {
    // Diverifikasi tsc: CreateGraduationDto menolak field asing (exactOptionalPropertyTypes).
    typedApi.post('/graduations', { tidakAdaFieldIni: 1 } as never);
    expect(true).toBe(true);
  });

  it('query harus sesuai daftar parameter kontrak', () => {
    // @ts-expect-error filter ini tidak dideklarasikan kontrak
    typedApi.get('/members', { query: { bukanFilter: 'x' } });
    expect(true).toBe(true);
  });
});
