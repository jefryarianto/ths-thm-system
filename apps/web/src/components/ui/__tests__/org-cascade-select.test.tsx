import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock apiClient sebelum mengimpor komponen (pola sama dengan use-org-filter.test).
vi.mock('@/lib/api-client', () => {
  const mockGet = vi.fn();
  return {
    default: { get: mockGet },
    unwrap: <T,>(r: { data: { data: T } }): T => r.data.data,
  };
});

import OrgCascadeSelect, {
  EMPTY_ORG_SELECTION,
  type OrgSelection,
} from '@/components/ui/org-cascade-select';
import apiClient from '@/lib/api-client';

const mockApi = vi.mocked(apiClient.get);

const DISTRIKS = [
  { id: 'd1', nama: 'Distrik Jakarta' },
  { id: 'd2', nama: 'Distrik Bandung' },
];
const WILAYAHS = [{ id: 'w1', nama: 'Wilayah Jakarta Pusat' }];
const RANTINGS = [
  { id: 'r1', nama: 'Ranting Menteng' },
  { id: 'r2', nama: 'Ranting Tanah Abang' },
];

/** Merutekan respons berdasarkan URL agar efek cascade terpisah jelas. */
function mockRoutes() {
  mockApi.mockImplementation((url: string) => {
    if (url === '/org-structure/distrik') {
      return Promise.resolve({ data: { data: DISTRIKS } });
    }
    if (url.startsWith('/org-structure/wilayah')) {
      return Promise.resolve({ data: { data: WILAYAHS } });
    }
    if (url.startsWith('/org-structure/ranting')) {
      return Promise.resolve({ data: { data: RANTINGS } });
    }
    return Promise.resolve({ data: { data: [] } });
  });
}

interface HarnessProps {
  initial?: OrgSelection;
  lockDistrikId?: string;
  lockWilayahId?: string;
  error?: string;
  onValue?: (next: OrgSelection) => void;
}

function Harness({ initial, lockDistrikId, lockWilayahId, error, onValue }: HarnessProps) {
  const [value, setValue] = useState<OrgSelection>(initial ?? EMPTY_ORG_SELECTION);
  return (
    <OrgCascadeSelect
      value={value}
      onChange={(next) => {
        setValue(next);
        onValue?.(next);
      }}
      lockDistrikId={lockDistrikId}
      lockWilayahId={lockWilayahId}
      error={error}
    />
  );
}

const distrikSelect = () => screen.getByTestId('org-cascade-distrik') as HTMLSelectElement;
const wilayahSelect = () => screen.getByTestId('org-cascade-wilayah') as HTMLSelectElement;
const rantingSelect = () => screen.getByTestId('org-cascade-ranting') as HTMLSelectElement;

describe('OrgCascadeSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoutes();
  });

  it('memuat opsi distrik dari API saat mount', async () => {
    render(<Harness />);

    await waitFor(() => expect(screen.getByText('Distrik Jakarta')).toBeInTheDocument());
    expect(screen.getByText('Distrik Bandung')).toBeInTheDocument();
    expect(mockApi).toHaveBeenCalledWith('/org-structure/distrik');
  });

  it('memuat wilayah setelah distrik dipilih dan mereset anak', async () => {
    const onValue = vi.fn();
    render(
      <Harness initial={{ distrikId: 'd1', wilayahId: 'w1', rantingId: 'r1' }} onValue={onValue} />,
    );

    await waitFor(() => expect(screen.getByText('Wilayah Jakarta Pusat')).toBeInTheDocument());

    // Ganti distrik → wilayah & ranting direset oleh handler (bukan oleh effect).
    fireEvent.change(distrikSelect(), { target: { value: 'd2' } });

    expect(onValue).toHaveBeenCalledWith({ distrikId: 'd2', wilayahId: '', rantingId: '' });
    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith('/org-structure/wilayah?distrikId=d2'),
    );
  });

  it('memuat ranting setelah wilayah dipilih dan mereset ranting', async () => {
    const onValue = vi.fn();
    render(
      <Harness initial={{ distrikId: 'd1', wilayahId: 'w1', rantingId: '' }} onValue={onValue} />,
    );

    await waitFor(() => expect(screen.getByText('Ranting Menteng')).toBeInTheDocument());

    fireEvent.change(wilayahSelect(), { target: { value: '' } });
    expect(onValue).toHaveBeenCalledWith({ distrikId: 'd1', wilayahId: '', rantingId: '' });
  });

  it('menonaktifkan ranting selama wilayah belum dipilih', async () => {
    render(<Harness />);
    await waitFor(() => expect(screen.getByText('Distrik Jakarta')).toBeInTheDocument());

    expect(rantingSelect()).toBeDisabled();
    expect(rantingSelect()).toHaveTextContent('Pilih Ranting...');
  });

  it('mengunci distrik ke lockDistrikId dan tetap menampilkan namanya', async () => {
    render(<Harness lockDistrikId="d1" />);

    await waitFor(() => expect(distrikSelect()).toBeDisabled());
    // 1 placeholder + 1 opsi terkunci.
    expect(distrikSelect().options).toHaveLength(2);
    expect(distrikSelect().options[1].value).toBe('d1');
    expect(distrikSelect().value).toBe('d1');
    expect(screen.getByText('Distrik Jakarta')).toBeInTheDocument();
  });

  it('mengunci wilayah ke lockWilayahId (satu opsi, disabled)', async () => {
    render(
      <Harness initial={{ distrikId: 'd1', wilayahId: 'w1', rantingId: '' }} lockWilayahId="w1" />,
    );

    await waitFor(() => expect(wilayahSelect()).toBeDisabled());
    // 1 placeholder + 1 opsi terkunci.
    expect(wilayahSelect().options).toHaveLength(2);
    expect(wilayahSelect().options[1].value).toBe('w1');
    expect(wilayahSelect().value).toBe('w1');
  });

  it('menampilkan pesan error di bawah field Ranting', async () => {
    render(<Harness error="Ranting wajib dipilih untuk role selain superadmin" />);

    await waitFor(() => expect(screen.getByText('Distrik Jakarta')).toBeInTheDocument());
    expect(
      screen.getByText('Ranting wajib dipilih untuk role selain superadmin'),
    ).toBeInTheDocument();
  });

  it('prefill: memuat & menyeleksi ranting tanpa ter-reset', async () => {
    render(<Harness initial={{ distrikId: 'd1', wilayahId: 'w1', rantingId: 'r2' }} />);

    await waitFor(() => expect(rantingSelect().value).toBe('r2'));
    expect(mockApi).toHaveBeenCalledWith('/org-structure/wilayah?distrikId=d1');
    expect(mockApi).toHaveBeenCalledWith('/org-structure/ranting?wilayahId=w1');
    expect(distrikSelect().value).toBe('d1');
    expect(wilayahSelect().value).toBe('w1');
  });

  it('tetap dapat dipakai saat API gagal (fallback daftar kosong)', async () => {
    mockApi.mockRejectedValue(new Error('Network error'));
    render(<Harness />);

    await waitFor(() => expect(screen.getByText('Pilih Distrik...')).toBeInTheDocument());
    expect(distrikSelect().options).toHaveLength(1); // hanya placeholder
  });
});
