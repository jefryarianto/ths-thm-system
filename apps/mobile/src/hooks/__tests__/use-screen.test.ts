import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import apiClient from '../../lib/api-client';
import { renderHook, waitFor } from '@testing-library/react';

const mockGet = jest.spyOn(apiClient, 'get').mockImplementation(() => Promise.reject(new Error('unexpected call')));

import { useActivities } from '../use-activities';
import { useCandidates } from '../use-candidates';
import { useDocuments } from '../use-documents';

const mockActivitiesResponse = {
  data: {
    data: [
      { id: 'a1', nama: 'Latihan Sabtu', tipe: 'latihan', lokasi: 'GOR', tanggalMulai: '2026-05-01T08:00:00.000Z', status: 'published' },
      { id: 'a2', nama: 'Ujian Tingkat', tipe: 'ujian_tingkat', tanggalMulai: '2026-05-15T09:00:00.000Z', status: 'closed' },
    ],
  },
};

const mockCandidatesResponse = {
  data: {
    data: [
      { id: 'c1', namaLengkap: 'Ali', jenisKelamin: 'L', status: 'diusulkan', createdAt: '2026-04-01T00:00:00.000Z', ranting: { nama: 'Ranting A' } },
      { id: 'c2', namaLengkap: 'Budi', jenisKelamin: 'L', status: 'lulus', createdAt: '2026-03-15T00:00:00.000Z' },
    ],
  },
};

const mockDocumentsResponse = {
  data: {
    data: [
      { id: 'd1', nomorDokumen: '001/KTA/2026', tipe: 'kartu_anggota', status: 'published', createdAt: '2026-04-10T00:00:00.000Z', anggota: { namaLengkap: 'Ali' } },
      { id: 'd2', nomorDokumen: '002/SP/2026', tipe: 'sertifikat_pendadaran', status: 'draft', createdAt: '2026-05-01T00:00:00.000Z' },
    ],
  },
};

beforeEach(() => {
  mockGet.mockClear();
});

describe('useActivities', () => {
  it('fetches activities with filter', async () => {
    mockGet.mockResolvedValueOnce(mockActivitiesResponse);

    const { result } = await renderHook(() => useActivities(''));

    expect(mockGet).toHaveBeenCalledWith('/activities', expect.objectContaining({ params: expect.any(Object) }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].nama).toBe('Latihan Sabtu');
  });

  it('passes status filter param', async () => {
    mockGet.mockResolvedValueOnce(mockActivitiesResponse);

    await renderHook(() => useActivities('published'));

    const callParams = (mockGet.mock.calls[0][1] as any)?.params;
    expect(callParams?.status).toBe('published');
  });
});

describe('useCandidates', () => {
  it('fetches candidates with search and filter', async () => {
    mockGet.mockResolvedValueOnce(mockCandidatesResponse);

    const { result } = await renderHook(() => useCandidates('', ''));

    expect(mockGet).toHaveBeenCalledWith('/candidates', expect.objectContaining({ params: expect.any(Object) }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].namaLengkap).toBe('Ali');
  });

  it('passes search param', async () => {
    mockGet.mockResolvedValueOnce(mockCandidatesResponse);

    await renderHook(() => useCandidates('Ali', ''));

    const callParams = (mockGet.mock.calls[0][1] as any)?.params;
    expect(callParams?.search).toBe('Ali');
  });
});

describe('useDocuments', () => {
  it('fetches documents with search and type filter', async () => {
    mockGet.mockResolvedValueOnce(mockDocumentsResponse);

    const { result } = await renderHook(() => useDocuments('', ''));

    expect(mockGet).toHaveBeenCalledWith('/documents', expect.objectContaining({ params: expect.any(Object) }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].tipe).toBe('kartu_anggota');
  });

  it('passes tipe filter param', async () => {
    mockGet.mockResolvedValueOnce(mockDocumentsResponse);

    await renderHook(() => useDocuments('', 'kartu_anggota'));

    const callParams = (mockGet.mock.calls[0][1] as any)?.params;
    expect(callParams?.tipe).toBe('kartu_anggota');
  });
});
