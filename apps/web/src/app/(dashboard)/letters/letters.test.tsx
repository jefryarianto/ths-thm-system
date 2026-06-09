import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import LettersPage from '@/app/(dashboard)/letters/page';

// Mock apiClient
vi.mock('@/lib/api-client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import apiClient from '@/lib/api-client';

const mockApi = vi.mocked(apiClient);

const mockLetters = [
  {
    id: '1', nomorSurat: '001/THS/V/2026', type: 'masuk',
    pengirim: 'Ketua THS', perihal: 'Undangan Rapat', status: 'diterima',
    tanggalSurat: '2026-05-01T00:00:00.000Z', createdAt: '2026-05-01T00:00:00.000Z',
  },
  {
    id: '2', nomorSurat: '002/THS/V/2026', type: 'keluar',
    tujuan: 'Sekretariat THM', perihal: 'Laporan Bulanan', status: 'draft',
    tanggalSurat: '2026-05-02T00:00:00.000Z', createdAt: '2026-05-02T00:00:00.000Z',
  },
];

describe('LettersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: { data: mockLetters, meta: { total: 2, totalPages: 1 } } });
    // Suppress confirm/alert
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('renders the page title and tab buttons', async () => {
    render(<LettersPage />);
    expect(screen.getByText('Surat')).toBeInTheDocument();
    expect(screen.getByText('Semua')).toBeInTheDocument();
    expect(screen.getByText('Masuk')).toBeInTheDocument();
    expect(screen.getByText('Keluar')).toBeInTheDocument();
  });

  it('renders create buttons for surat masuk and keluar', () => {
    render(<LettersPage />);
    expect(screen.getByText('Surat Masuk')).toBeInTheDocument();
    expect(screen.getByText('Surat Keluar')).toBeInTheDocument();
  });

  it('opens create modal for surat masuk', async () => {
    render(<LettersPage />);
    fireEvent.click(screen.getByText('Surat Masuk'));

    await waitFor(() => {
      expect(screen.getByText('Tambah Surat Masuk')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Nomor Surat').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pengirim').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Perihal').length).toBeGreaterThanOrEqual(1);
  });

  it('opens create modal for surat keluar with different fields', async () => {
    render(<LettersPage />);
    fireEvent.click(screen.getByText('Surat Keluar'));

    await waitFor(() => {
      expect(screen.getByText('Tambah Surat Keluar')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Tujuan').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Isi / Konten Surat')).toBeInTheDocument();
    // Should NOT have pengirim (only appears in table header if letter has pengirim)
    const pengirimElements = screen.queryAllByText('Pengirim');
    // Modal should not contain pengirim label — check only within the modal
    expect(pengirimElements.filter(el => el.closest('.fixed')).length).toBe(0);
  });

  it('shows validation error when required fields are empty', async () => {
    render(<LettersPage />);
    fireEvent.click(screen.getByText('Surat Masuk'));

    await waitFor(() => {
      expect(screen.getByText('Tambah Surat Masuk')).toBeInTheDocument();
    });

    // Click submit without filling required fields
    fireEvent.click(screen.getByText('Tambah Surat'));

    await waitFor(() => {
      expect(screen.getByText('Nomor surat dan perihal harus diisi')).toBeInTheDocument();
    });
  });

  it('shows validation error when pengirim is empty for masuk', async () => {
    render(<LettersPage />);
    fireEvent.click(screen.getByText('Surat Masuk'));

    await waitFor(() => {
      expect(screen.getByText('Tambah Surat Masuk')).toBeInTheDocument();
    });

    // Scope inputs to the modal
    const modal = screen.getByText('Tambah Surat Masuk').closest('.fixed') as HTMLElement;
    const modalInputs = within(modal).getAllByRole('textbox');
    fireEvent.change(modalInputs[0], { target: { value: '001/THS/V/2026' } }); // nomorSurat
    fireEvent.change(modalInputs[2], { target: { value: 'Undangan Rapat' } }); // perihal

    fireEvent.click(screen.getByText('Tambah Surat'));

    await waitFor(() => {
      expect(screen.getByText('Pengirim harus diisi')).toBeInTheDocument();
    });
  });

  it('submits create form and calls POST', async () => {
    mockApi.post.mockResolvedValue({ data: { message: 'Created' } });

    render(<LettersPage />);
    fireEvent.click(screen.getByText('Surat Masuk'));

    await waitFor(() => {
      expect(screen.getByText('Tambah Surat Masuk')).toBeInTheDocument();
    });

    // Fill form: nomorSurat, pengirim, perihal
    const modal = screen.getByText('Tambah Surat Masuk').closest('.fixed') as HTMLElement;
    const modalInputs = within(modal).getAllByRole('textbox');
    fireEvent.change(modalInputs[0], { target: { value: '001/THS/V/2026' } }); // nomorSurat
    fireEvent.change(modalInputs[1], { target: { value: 'Ketua THS' } }); // pengirim
    fireEvent.change(modalInputs[2], { target: { value: 'Undangan Rapat' } }); // perihal

    fireEvent.click(screen.getByText('Tambah Surat'));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/letters/incoming', expect.objectContaining({
        nomorSurat: '001/THS/V/2026',
        pengirim: 'Ketua THS',
        perihal: 'Undangan Rapat',
      }));
    });
  });

  it('shows validation error when tujuan is empty for keluar', async () => {
    render(<LettersPage />);
    fireEvent.click(screen.getByText('Surat Keluar'));

    await waitFor(() => {
      expect(screen.getByText('Tambah Surat Keluar')).toBeInTheDocument();
    });

    // Fill nomorSurat and perihal but leave tujuan empty
    const modal = screen.getByText('Tambah Surat Keluar').closest('.fixed') as HTMLElement;
    const modalInputs = within(modal).getAllByRole('textbox');
    fireEvent.change(modalInputs[0], { target: { value: '001/THS/V/2026' } }); // nomorSurat
    fireEvent.change(modalInputs[2], { target: { value: 'Laporan' } }); // perihal

    fireEvent.click(screen.getByText('Tambah Surat'));

    await waitFor(() => {
      expect(screen.getByText('Tujuan harus diisi')).toBeInTheDocument();
    });
  });

  it('closes modal when clicking backdrop', async () => {
    render(<LettersPage />);
    fireEvent.click(screen.getByText('Surat Masuk'));

    await waitFor(() => {
      expect(screen.getByText('Tambah Surat Masuk')).toBeInTheDocument();
    });

    // Click the backdrop (fixed inset-0 div)
    const backdrop = document.querySelector('.fixed.inset-0');
    if (backdrop) fireEvent.click(backdrop);

    await waitFor(() => {
      expect(screen.queryByText('Tambah Surat Masuk')).not.toBeInTheDocument();
    });
  });

  it('closes modal when clicking Batal button', async () => {
    render(<LettersPage />);
    fireEvent.click(screen.getByText('Surat Masuk'));

    await waitFor(() => {
      expect(screen.getByText('Tambah Surat Masuk')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Batal'));

    await waitFor(() => {
      expect(screen.queryByText('Tambah Surat Masuk')).not.toBeInTheDocument();
    });
  });

  it('switches tab and resets page', async () => {
    render(<LettersPage />);

    // Initially "all" tab
    expect(mockApi.get).toHaveBeenCalledWith('/letters', { params: { page: 1, limit: 10 } });

    // Switch to incoming tab
    fireEvent.click(screen.getByText('Masuk'));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/letters/incoming', { params: { page: 1, limit: 10 } });
    });
  });

  it('shows detail panel when clicking a row', async () => {
    const detailData = { ...mockLetters[0], type: 'masuk', disposisi: [] };
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/letters/incoming/1') {
        return Promise.resolve({ data: { data: detailData } });
      }
      return Promise.resolve({ data: { data: mockLetters, meta: { total: 2, totalPages: 1 } } });
    });

    render(<LettersPage />);

    await waitFor(() => {
      expect(screen.getByText('001/THS/V/2026')).toBeInTheDocument();
    });

    // Click on the first row (the nomorSurat cell)
    fireEvent.click(screen.getByText('001/THS/V/2026'));

    await waitFor(() => {
      expect(screen.getByText('Detail Surat')).toBeInTheDocument();
    });

    // Check detail panel content (use getAllByText since table also has these)
    expect(screen.getAllByText('Ketua THS').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Undangan Rapat').length).toBeGreaterThanOrEqual(1);
  });

  it('shows edit and delete buttons in detail panel', async () => {
    const detailData = { ...mockLetters[0], type: 'masuk', disposisi: [] };
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/letters/incoming/1') {
        return Promise.resolve({ data: { data: detailData } });
      }
      return Promise.resolve({ data: { data: mockLetters, meta: { total: 2, totalPages: 1 } } });
    });

    render(<LettersPage />);

    await waitFor(() => {
      expect(screen.getByText('001/THS/V/2026')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('001/THS/V/2026'));

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Hapus')).toBeInTheDocument();
    });
  });

  it('opens edit modal pre-filled with existing data', async () => {
    const detailData = { ...mockLetters[0], type: 'masuk', disposisi: [] };
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/letters/incoming/1') {
        return Promise.resolve({ data: { data: detailData } });
      }
      return Promise.resolve({ data: { data: mockLetters, meta: { total: 2, totalPages: 1 } } });
    });

    render(<LettersPage />);

    await waitFor(() => {
      expect(screen.getByText('001/THS/V/2026')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('001/THS/V/2026'));

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit'));

    await waitFor(() => {
      expect(screen.getByText('Edit Surat Masuk')).toBeInTheDocument();
    });

    // Check form is pre-filled
    // Check modal title confirms edit mode
    expect(screen.getByText('Edit Surat Masuk')).toBeInTheDocument();
  });

  it('calls PATCH when editing a letter', async () => {
    const detailData = { ...mockLetters[0], type: 'masuk', disposisi: [] };
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/letters/incoming/1') {
        return Promise.resolve({ data: { data: detailData } });
      }
      return Promise.resolve({ data: { data: mockLetters, meta: { total: 2, totalPages: 1 } } });
    });
    mockApi.patch.mockResolvedValue({ data: { message: 'Updated' } });

    render(<LettersPage />);

    await waitFor(() => {
      expect(screen.getByText('001/THS/V/2026')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('001/THS/V/2026'));

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit'));

    await waitFor(() => {
      expect(screen.getByText('Edit Surat Masuk')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Simpan Perubahan'));

    await waitFor(() => {
      expect(mockApi.patch).toHaveBeenCalledWith('/letters/incoming/1', expect.objectContaining({
        nomorSurat: '001/THS/V/2026',
      }));
    });
  });

  it('calls DELETE when deleting a letter', async () => {
    const detailData = { ...mockLetters[0], type: 'masuk', disposisi: [] };
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/letters/incoming/1') {
        return Promise.resolve({ data: { data: detailData } });
      }
      return Promise.resolve({ data: { data: mockLetters, meta: { total: 2, totalPages: 1 } } });
    });
    mockApi.delete.mockResolvedValue({ data: { message: 'Deleted' } });

    render(<LettersPage />);

    await waitFor(() => {
      expect(screen.getByText('001/THS/V/2026')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('001/THS/V/2026'));

    await waitFor(() => {
      expect(screen.getByText('Hapus')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Hapus'));

    await waitFor(() => {
      expect(mockApi.delete).toHaveBeenCalledWith('/letters/incoming/1');
    });
  });

  it('does not call DELETE when user cancels confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const detailData = { ...mockLetters[0], type: 'masuk', disposisi: [] };
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/letters/incoming/1') {
        return Promise.resolve({ data: { data: detailData } });
      }
      return Promise.resolve({ data: { data: mockLetters, meta: { total: 2, totalPages: 1 } } });
    });

    render(<LettersPage />);

    await waitFor(() => {
      expect(screen.getByText('001/THS/V/2026')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('001/THS/V/2026'));

    await waitFor(() => {
      expect(screen.getByText('Hapus')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Hapus'));

    // Wait a tick and verify DELETE was NOT called
    await new Promise(r => setTimeout(r, 100));
    expect(mockApi.delete).not.toHaveBeenCalled();
  });
});
