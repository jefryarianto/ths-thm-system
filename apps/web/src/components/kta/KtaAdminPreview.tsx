'use client';

import { useRef, useState, useCallback } from 'react';
import { KtaCard } from './KtaCard';
import { downloadCardPng } from './exportPng';
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
      const svg = document.querySelector('svg.kta-svg');
      if (!svg) return;

      await document.fonts.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

      const node = svg.cloneNode(true) as SVGSVGElement;
      const images = Array.from(node.querySelectorAll('image'));

      // Embed remote images (CORS)
      const embed = async (href: string): Promise<string> => {
        if (href.startsWith('data:')) return href;
        let response: Response;
        try { response = await fetch(href, { mode: 'cors' }); }
        catch { return href; }
        if (!response.ok) return href;
        const blob = await response.blob();
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Gagal'));
          reader.readAsDataURL(blob);
        });
      };

      await Promise.all(images.map(async img => {
        const href = img.getAttribute('href');
        if (href) { await embed(href); }
      }));

      // Embed fonts
      const [regular, bold] = await Promise.all([
        embed('/kta/fonts/DejaVuSans.ttf'),
        embed('/kta/fonts/DejaVuSans-Bold.ttf')
      ]);

      const defs = node.querySelector('defs') || node.insertBefore(document.createElementNS('http://www.w3.org/2000/svg', 'defs'), node.firstChild);
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = `
        @font-face{font-family:KTADejaVu;src:url('${regular}') format('truetype');font-weight:400}
        @font-face{font-family:KTADejaVu;src:url('${bold}') format('truetype');font-weight:700}
      `;
      defs.appendChild(style);

      // Render at 2022×1275 px = 856×539.8 mm at 10 px/mm
      node.setAttribute('width', '2022');
      node.setAttribute('height', '1275');
      node.style.width = '2022px';
      node.style.height = '1275px';

      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(node)], { type: 'image/svg+xml;charset=utf-8' }));
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Gagal render SVG'));
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 2022;
      canvas.height = 1275;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas tidak tersedia');

      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 2022, 1275);
      ctx.drawImage(img, 0, 0, 2022, 1275);

      // Open new tab with PNG for printing
      const printUrl = canvas.toDataURL('image/png');
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<img src="${printUrl}" style="width:100%;height:auto;">`);
        printWindow.document.close();
        // Wait for image to load, then print
        await new Promise<void>((resolve) => {
          img.onload = () => {
            // Print the canvas content
            printWindow.print();
            resolve();
          };
        });
      }
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Gagal cetak KTA:', e);
      alert('Gagal mencetak: ' + (e instanceof Error ? e.message : 'Unknown error'));
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