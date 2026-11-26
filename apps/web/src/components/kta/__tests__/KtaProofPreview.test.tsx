import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KtaProofPreview from '@/components/kta/KtaProofPreview';

const { getMock, createObjectURLMock, revokeObjectURLMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  createObjectURLMock: vi.fn(() => 'blob:proof-url'),
  revokeObjectURLMock: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({ default: { get: getMock } }));

vi.mock('@/components/bukti-preview-modal', () => ({
  default: ({
    open,
    onClose,
    buktiPath,
    displayName,
  }: {
    open: boolean;
    onClose: () => void;
    buktiPath?: string;
    displayName?: string;
  }) =>
    open ? (
      <div data-testid="bukti-preview-modal">
        <span data-testid="preview-src">{buktiPath}</span>
        <span data-testid="preview-name">{displayName}</span>
        <button onClick={onClose}>Tutup pratinjau</button>
      </div>
    ) : null,
}));

function response(blob: Blob, headers: Record<string, string> = {}) {
  return { data: blob, headers };
}

describe('KtaProofPreview', () => {
  beforeEach(() => {
    getMock.mockReset();
    createObjectURLMock.mockClear();
    revokeObjectURLMock.mockClear();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('menampilkan Bukti tidak tersedia dan tidak memanggil API tanpa buktiBayarPath', () => {
    render(<KtaProofPreview applicationId="app-1" buktiBayarPath={null} />);

    expect(screen.getByText('Bukti tidak tersedia')).toBeInTheDocument();
    expect(getMock).not.toHaveBeenCalled();
  });

  it('menampilkan modal gambar dan mencabut object URL saat ditutup', async () => {
    getMock.mockResolvedValue(
      response(new Blob(['gambar'], { type: 'image/png' }), {
        'content-type': 'image/png',
        'content-disposition': 'inline; filename="kta-proof-123.png"',
      }),
    );

    render(<KtaProofPreview applicationId="app-1" buktiBayarPath="/api/uploads/kta-proofs/kta-proof-123.png" />);

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/kta-applications/app-1/proof', { responseType: 'blob' });
    });
    await waitFor(() => expect(screen.getByRole('button', { name: /Lihat Bukti/i })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: /Lihat Bukti/i }));

    expect(await screen.findByTestId('bukti-preview-modal')).toBeInTheDocument();
    expect(screen.getByTestId('preview-src')).toHaveTextContent('blob:proof-url');
    expect(screen.getByTestId('preview-name')).toHaveTextContent('kta-proof-123.png');

    fireEvent.click(screen.getByRole('button', { name: 'Tutup pratinjau' }));

    expect(screen.queryByTestId('bukti-preview-modal')).not.toBeInTheDocument();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:proof-url');
  });

  it('dapat membuka kembali pratinjau gambar setelah ditutup', async () => {
    getMock.mockResolvedValue(
      response(new Blob(['gambar'], { type: 'image/png' }), {
        'content-type': 'image/png',
        'content-disposition': 'inline; filename="kta-proof-123.png"',
      }),
    );

    render(<KtaProofPreview applicationId="app-1" buktiBayarPath="/api/uploads/kta-proofs/kta-proof-123.png" />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Lihat Bukti/i })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /Lihat Bukti/i }));
    expect(await screen.findByTestId('bukti-preview-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tutup pratinjau' }));
    await waitFor(() => expect(screen.queryByTestId('bukti-preview-modal')).not.toBeInTheDocument());

    expect(screen.getByRole('button', { name: /Lihat Bukti/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Lihat Bukti/i }));

    expect(await screen.findByTestId('bukti-preview-modal')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it('menampilkan iframe dan tautan unduh untuk PDF, bukan img', async () => {
    getMock.mockResolvedValue(
      response(new Blob(['%PDF-1.4\n1 0 obj\n%%EOF'], { type: 'application/pdf' }), {
        'content-type': 'application/pdf',
        'content-disposition': 'inline; filename="kta-proof-123.pdf"',
      }),
    );

    const { container } = render(
      <KtaProofPreview applicationId="app-2" buktiBayarPath="/api/uploads/kta-proofs/kta-proof-123.pdf" />,
    );

    const iframe = await waitFor(() => {
      const found = container.querySelector('iframe');
      expect(found).not.toBeNull();
      return found as HTMLIFrameElement;
    });

    expect(iframe).toHaveAttribute('src', 'blob:proof-url');
    expect(iframe).toHaveAttribute('sandbox');
    expect(iframe.getAttribute('sandbox') || '').toContain('allow-same-origin');
    expect(iframe.getAttribute('sandbox') || '').not.toContain('allow-scripts');
    expect(screen.getByRole('link', { name: /Unduh PDF/i })).toHaveAttribute('download', 'kta-proof-123.pdf');
    expect(container.querySelector('img')).toBeNull();
  });

  it('menolak konten PDF tanpa magic bytes %PDF-', async () => {
    getMock.mockResolvedValue(
      response(new Blob(['<html><script>alert(1)</script></html>'], { type: 'application/pdf' }), {
        'content-type': 'application/pdf',
        'content-disposition': 'inline; filename="kta-proof-malicious.pdf"',
      }),
    );

    const { container } = render(
      <KtaProofPreview applicationId="app-4" buktiBayarPath="/api/uploads/kta-proofs/kta-proof-malicious.pdf" />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Bukti PDF tidak valid');
    expect(container.querySelector('iframe')).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('menampilkan pesan error saat permintaan bukti gagal', async () => {
    getMock.mockRejectedValue(new Error('Gagal memuat bukti'));

    render(<KtaProofPreview applicationId="app-3" buktiBayarPath="/api/uploads/kta-proofs/kta-proof-3.png" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal memuat bukti pembayaran');
    expect(screen.queryByRole('button', { name: /Lihat Bukti/i })).not.toBeInTheDocument();
  });
});
