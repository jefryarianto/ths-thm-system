'use client';

import { useRef, useState, useCallback } from 'react';
import { KtaCard } from './KtaCard';
import { downloadCardPng, cardPngDataUrl } from './exportPng';
import type { Anggota } from './types';

export interface KtaAdminPreviewProps {
  anggota: Anggota;
}

export function KtaAdminPreview({ anggota }: KtaAdminPreviewProps) {
  const depanRef = useRef<SVGSVGElement>(null);
  const belakangRef = useRef<SVGSVGElement>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [exportError, setExportError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleWarnings = useCallback((msgs: string[]) => {
    setWarnings(msgs);
  }, []);

  const unduh = async (side: 'depan' | 'belakang') => {
    const svg = side === 'depan' ? depanRef.current : belakangRef.current;
    if (!svg || warnings.length > 0) return;
    try {
      setExportError('');
      setIsExporting(true);
      await downloadCardPng(svg, side);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Ekspor gagal');
    } finally {
      setIsExporting(false);
    }
  };

  const cetak = async () => {
    try {
      // Generate PNG at correct DPI (10 px/mm = ~254 DPI) for accurate printing
      const svg = depanRef.current ?? (document.querySelector('svg.kta-svg') as SVGSVGElement | null);
      if (!svg) return;
      setExportError('');
      const dataUrl = await cardPngDataUrl(svg);

      // Open new tab with PNG, wait for the image to decode, then print.
      const printWindow = window.open('', '_blank');
      if (!printWindow) throw new Error('Jendela cetak diblokir — izinkan popup untuk situs ini.');
      printWindow.document.write(
        `<title>Cetak KTA</title><body style="margin:0"><img id="kta-print" src="${dataUrl}" style="width:100%;height:auto;"></body>`
      );
      printWindow.document.close();
      const popupImg = printWindow.document.getElementById('kta-print') as HTMLImageElement | null;
      if (popupImg && !popupImg.complete) {
        await new Promise<void>(resolve => {
          popupImg.addEventListener('load', () => resolve(), { once: true });
          popupImg.addEventListener('error', () => resolve(), { once: true });
        });
      }
      printWindow.focus();
      printWindow.print();
    } catch (e) {
      console.error('Gagal cetak KTA:', e);
      setExportError(e instanceof Error ? e.message : 'Cetak gagal');
    }
  };

  return (
    <section className="kta-admin-preview space-y-6">
      {warnings.length > 0 && (
        <div role="alert" className="warnings bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4">
          <p className="font-semibold mb-2">Peringkat Validasi Kartu:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {exportError && (
        <div role="alert" className="error bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm font-medium">
          {exportError}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card-preview space-y-2 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Depan</h3>
          <div className="w-full flex justify-center overflow-x-auto">
            <KtaCard side="depan" anggota={anggota} svgRef={depanRef} onWarnings={handleWarnings} />
          </div>
        </div>

        <div className="card-preview space-y-2 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Belakang</h3>
          <div className="w-full flex justify-center overflow-x-auto">
            <KtaCard side="belakang" anggota={anggota} svgRef={belakangRef} />
          </div>
        </div>
      </div>

      <div className="actions flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          disabled={warnings.length > 0 || isExporting}
          onClick={() => unduh('depan')}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
        >
          Unduh Depan (PNG)
        </button>

        <button
          type="button"
          disabled={warnings.length > 0 || isExporting}
          onClick={() => unduh('belakang')}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
        >
          Unduh Belakang (PNG)
        </button>

        <button
          type="button"
          onClick={cetak}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors"
        >
          Cetak (Ctrl+P)
        </button>
      </div>
    </section>
  );
}

export default KtaAdminPreview;