'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Jumlah item per halaman (untuk teks "Showing X-Y of Z") */
  pageSize?: number;
}

export default function Pagination({ page, totalPages, total, onPageChange, pageSize = 15 }: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const handlePrev = () => {
    if (page > 1) onPageChange(page - 1);
  };

  const handleNext = () => {
    if (page < totalPages) onPageChange(page + 1);
  };

  const renderPageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages.map((p) => (
      <button
        key={p}
        onClick={() => onPageChange(p)}
        aria-current={p === page ? 'page' : undefined}
        className={`px-2.5 py-1 text-sm rounded-md ${
          p === page
            ? 'bg-primary text-white'
            : 'text-muted hover:bg-surface-variant'
        }`}
      >
        {p}
      </button>
    ));
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <p className="text-sm text-muted">
        Showing <strong className="text-text">{start}-{end}</strong> of <strong className="text-text">{total}</strong>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={handlePrev}
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
          className="p-1.5 text-muted hover:bg-surface-variant rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        {renderPageNumbers()}
        <button
          onClick={handleNext}
          disabled={page >= totalPages}
          aria-label="Halaman berikutnya"
          className="p-1.5 text-muted hover:bg-surface-variant rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
