'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Modal from '@/components/ui/modal';
import { Download, ZoomIn, ZoomOut, RotateCcw, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

export interface BuktiImage {
  path: string;
  name?: string;
}

interface BuktiPreviewModalProps {
  open: boolean;
  onClose: () => void;
  /** Single image (backward compatible) */
  buktiPath?: string;
  /** Multiple images for gallery navigation */
  images?: BuktiImage[];
  /** Starting index when using images array */
  initialIndex?: number;
  anggotaName?: string;
}

export default function BuktiPreviewModal({
  open,
  onClose,
  buktiPath,
  images,
  initialIndex = 0,
  anggotaName,
}: BuktiPreviewModalProps) {
  // Build unified image list from either `images` or single `buktiPath`
  const allImages: BuktiImage[] =
    images && images.length > 0
      ? images
      : buktiPath
        ? [{ path: buktiPath, name: anggotaName }]
        : [];

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Sync initialIndex from props when modal opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    }
  }, [open, initialIndex]);

  const currentImage = allImages[currentIndex];
  const hasMultiple = allImages.length > 1;

  // --- Navigation ---
  const goTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= allImages.length) return;
      setSlideDir(idx > currentIndex ? 'left' : 'right');
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      // Small delay so slide animation can play
      requestAnimationFrame(() => {
        setCurrentIndex(idx);
        setTimeout(() => setSlideDir(null), 200);
      });
    },
    [currentIndex, allImages.length]
  );

  const goPrev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);
  const goNext = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);

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
    if (!currentImage) return;
    const link = document.createElement('a');
    link.href = currentImage.path;
    link.download = `bukti-pembayaran-${currentImage.name || anggotaName || 'upload'}`;
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
    setCurrentIndex(initialIndex);
    onClose();
  };

  // --- Keyboard navigation ---
  useEffect(() => {
    if (!open || !hasMultiple) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, hasMultiple, goPrev, goNext]);

  // --- Touch gesture refs ---
  const touchRef = useRef({
    initialDist: 0,
    initialZoom: 1,
    lastTap: 0,
    startX: 0,
    startY: 0,
    panX: 0,
    panY: 0,
    isDragging: false,
    isSwiping: false,
    swipeStartX: 0,
    swipeDelta: 0,
  });

  const getDistance = (
    t1: { clientX: number; clientY: number },
    t2: { clientX: number; clientY: number }
  ) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const t = touchRef.current;

      if (e.touches.length === 2) {
        t.initialDist = getDistance(e.touches[0], e.touches[1]);
        t.initialZoom = zoom;
        e.preventDefault();
      } else if (e.touches.length === 1) {
        // Double-tap check
        const now = Date.now();
        if (now - t.lastTap < 300) {
          setZoom((prev) => (prev >= 1.9 ? 1 : 2));
          t.lastTap = 0;
          return;
        }
        t.lastTap = now;

        if (zoom > 1) {
          // Pan mode
          t.startX = e.touches[0].clientX;
          t.startY = e.touches[0].clientY;
          t.panX = pan.x;
          t.panY = pan.y;
          t.isDragging = true;
          t.isSwiping = false;
        } else if (hasMultiple) {
          // Swipe mode (only at 1x zoom)
          t.swipeStartX = e.touches[0].clientX;
          t.swipeDelta = 0;
          t.isSwiping = true;
          t.isDragging = false;
        }
      }
    },
    [zoom, pan, hasMultiple]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const t = touchRef.current;

      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const scale = dist / t.initialDist;
        const newZoom = Math.min(Math.max(t.initialZoom * scale, 0.5), 3);
        setZoom(newZoom);
      } else if (e.touches.length === 1) {
        if (t.isDragging && zoom > 1) {
          // Pan move
          const dx = e.touches[0].clientX - t.startX;
          const dy = e.touches[0].clientY - t.startY;
          const maxPan = (zoom - 1) * 200;
          setPan({
            x: Math.min(Math.max(t.panX + dx, -maxPan), maxPan),
            y: Math.min(Math.max(t.panY + dy, -maxPan), maxPan),
          });
        } else if (t.isSwiping && zoom <= 1) {
          // Swipe tracking
          t.swipeDelta = e.touches[0].clientX - t.swipeStartX;
          e.preventDefault();
        }
      }
    },
    [zoom]
  );

  const handleTouchEnd = useCallback(() => {
    const t = touchRef.current;
    const threshold = 60; // px required to trigger swipe

    if (t.isSwiping && Math.abs(t.swipeDelta) > threshold && zoom <= 1) {
      if (t.swipeDelta > 0 && currentIndex > 0) {
        goPrev();
      } else if (t.swipeDelta < 0 && currentIndex < allImages.length - 1) {
        goNext();
      }
    }

    t.isDragging = false;
    t.isSwiping = false;
    t.swipeDelta = 0;
  }, [zoom, currentIndex, allImages.length, goPrev, goNext]);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        hasMultiple
          ? `Bukti Pembayaran (${currentIndex + 1} / ${allImages.length})`
          : `Bukti Pembayaran${anggotaName ? ` — ${anggotaName}` : ''}`
      }
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            {/* Prev button */}
            {hasMultiple && (
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                title="Gambar sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
            )}

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

            {/* Next button */}
            {hasMultiple && (
              <button
                onClick={goNext}
                disabled={currentIndex === allImages.length - 1}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                title="Gambar berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition"
            >
              <Download size={12} /> Unduh
            </button>
            {currentImage && (
              <a
                href={currentImage.path}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                <ExternalLink size={12} /> Buka Tab Baru
              </a>
            )}
          </div>
        </div>

        {/* Image counter dots */}
        {hasMultiple && allImages.length <= 20 && (
          <div className="flex items-center justify-center gap-1.5">
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex
                    ? 'bg-blue-600 dark:bg-blue-400 scale-125'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
                title={img.name || `Gambar ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Mobile touch hint */}
        <div className="sm:hidden flex items-center justify-center gap-3 text-[10px] text-gray-400 dark:text-gray-500 flex-wrap">
          <span>👆 2 jari = zoom</span>
          <span>👆👆 Dbl tap = toggle zoom</span>
          {hasMultiple && <span>👈👉 Geser = gambar berikutnya</span>}
        </div>

        {/* Image Container with touch gestures */}
        <div
          className="relative bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 min-h-[300px] max-h-[60vh] flex items-center justify-center select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }}
        >
          {/* Slide-in animation wrapper */}
          <div
            className="flex items-center justify-center w-full h-full transition-transform duration-200 ease-out"
            style={{
              transform:
                slideDir === 'left'
                  ? 'translateX(30px)'
                  : slideDir === 'right'
                    ? 'translateX(-30px)'
                    : 'translateX(0)',
              opacity: slideDir ? 0.5 : 1,
            }}
          >
            {currentImage && (
              <img
                ref={imgRef}
                src={currentImage.path}
                alt={`Bukti pembayaran${currentImage.name ? ` ${currentImage.name}` : ''}`}
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
                      <a href="${currentImage.path}" target="_blank" rel="noopener noreferrer"
                         class="mt-2 inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm hover:underline">
                        Buka di tab baru
                      </a>
                    `;
                    parent.appendChild(errorDiv);
                  }
                }}
              />
            )}
          </div>

          {/* Desktop keyboard hint */}
          {hasMultiple && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-2 py-1 rounded">
              <span>← →</span>
              <span>Navigate</span>
            </div>
          )}
        </div>

        {/* Image caption */}
        {currentImage?.name && (
          <p className="text-xs text-gray-600 dark:text-gray-300 text-center font-medium">
            {currentImage.name}
          </p>
        )}

        {/* File Path */}
        {currentImage && (
          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate" title={currentImage.path}>
            {currentImage.path}
          </p>
        )}
      </div>
    </Modal>
  );
}
