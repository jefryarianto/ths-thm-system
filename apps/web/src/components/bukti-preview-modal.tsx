'use client';

import { useState, useRef, useCallback } from 'react';
import Modal from '@/components/ui/modal';
import { Download, ZoomIn, ZoomOut, RotateCcw, ExternalLink } from 'lucide-react';

interface BuktiPreviewModalProps {
  open: boolean;
  onClose: () => void;
  buktiPath: string;
  anggotaName?: string;
}

export default function BuktiPreviewModal({
  open,
  onClose,
  buktiPath,
  anggotaName,
}: BuktiPreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  // --- Touch gesture refs (not triggering re-renders) ---
  const touchRef = useRef({
    initialDist: 0,
    initialZoom: 1,
    lastTap: 0,
    startX: 0,
    startY: 0,
    panX: 0,
    panY: 0,
    isDragging: false,
  });

  // --- Button handlers ---
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = buktiPath;
    link.download = `bukti-pembayaran-${anggotaName || 'upload'}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    onClose();
  };

  // --- Touch handlers ---
  const getDistance = (t1: { clientX: number; clientY: number }, t2: { clientX: number; clientY: number }) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const t = touchRef.current;

      if (e.touches.length === 2) {
        // Pinch start
        t.initialDist = getDistance(e.touches[0], e.touches[1]);
        t.initialZoom = zoom;
        e.preventDefault();
      } else if (e.touches.length === 1) {
        // Check for double-tap (within 300ms)
        const now = Date.now();
        if (now - t.lastTap < 300) {
          // Double-tap: toggle between 1x and 2x
          setZoom((prev) => (prev >= 1.9 ? 1 : 2));
          t.lastTap = 0;
          return;
        }
        t.lastTap = now;

        // Single-finger pan (only when zoomed in)
        if (zoom > 1) {
          t.startX = e.touches[0].clientX;
          t.startY = e.touches[0].clientY;
          t.panX = pan.x;
          t.panY = pan.y;
          t.isDragging = true;
        }
      }
    },
    [zoom, pan]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const t = touchRef.current;

      if (e.touches.length === 2) {
        // Pinch move
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const scale = dist / t.initialDist;
        const newZoom = Math.min(Math.max(t.initialZoom * scale, 0.5), 3);
        setZoom(newZoom);
      } else if (e.touches.length === 1 && t.isDragging && zoom > 1) {
        // Pan move
        const dx = e.touches[0].clientX - t.startX;
        const dy = e.touches[0].clientY - t.startY;
        // Clamp pan so image doesn't leave viewport
        const maxPan = (zoom - 1) * 200;
        setPan({
          x: Math.min(Math.max(t.panX + dx, -maxPan), maxPan),
          y: Math.min(Math.max(t.panY + dy, -maxPan), maxPan),
        });
      }
    },
    [zoom]
  );

  const handleTouchEnd = useCallback(() => {
    touchRef.current.isDragging = false;
  }, []);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Bukti Pembayaran${anggotaName ? ` — ${anggotaName}` : ''}`}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />
            <button
              onClick={handleRotate}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              title="Rotate"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={handleReset}
              className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              Reset
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition"
            >
              <Download size={12} /> Unduh
            </button>
            <a
              href={buktiPath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              <ExternalLink size={12} /> Buka Tab Baru
            </a>
          </div>
        </div>

        {/* Mobile touch hint */}
        <div className="sm:hidden flex items-center justify-center gap-4 text-[10px] text-gray-400 dark:text-gray-500">
          <span>👆 Press 2 fingers to zoom</span>
          <span>👆👆 Double tap to toggle zoom</span>
          <span>✋ Drag to pan</span>
        </div>

        {/* Image Container with touch gestures */}
        <div
          className="relative bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 min-h-[300px] max-h-[60vh] flex items-center justify-center select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }}
        >
          <img
            ref={imgRef}
            src={buktiPath}
            alt={`Bukti pembayaran${anggotaName ? ` ${anggotaName}` : ''}`}
            className="max-w-none transition-transform duration-200 ease-out pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent && !parent.querySelector('.error-message')) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message text-center p-8';
                errorDiv.innerHTML = `
                  <p class="text-gray-500 dark:text-gray-400 text-sm">Gagal memuat gambar bukti.</p>
                  <a href="${buktiPath}" target="_blank" rel="noopener noreferrer"
                     class="mt-2 inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm hover:underline">
                    Buka di tab baru
                  </a>
                `;
                parent.appendChild(errorDiv);
              }
            }}
          />
        </div>

        {/* File Path */}
        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate" title={buktiPath}>
          {buktiPath}
        </p>
      </div>
    </Modal>
  );
}
