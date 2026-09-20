'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface ExportMenuProps {
  /** Label to display on the button */
  label?: string;
  /** Current table data to export (client-side). Pass null to use server export. */
  data?: Record<string, unknown>[];
  /** Column headers for client-side export */
  headers?: string[];
  /** Server export type (passed to GET /api/reports/export/:type) */
  serverType?: string;
  /** File name (without extension) */
  filename?: string;
  /** Whether export is loading */
  disabled?: boolean;
}

export default function ExportMenu({
  label = 'Export',
  data,
  headers,
  serverType,
  filename = 'data-export',
  disabled = false,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<'xlsx' | 'csv' | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClientExport = async (format: 'xlsx' | 'csv') => {
    if (!data || !headers) return;
    setLoading(format);

    // Dynamic import to avoid bundle bloat
    try {
      const { downloadXlsx, downloadCsv, toCsv } = await import('@/lib/export-utils');

      if (format === 'xlsx') {
        downloadXlsx(data, headers, filename);
      } else {
        const csv = toCsv(data, headers);
        downloadCsv(csv, `${filename}.csv`);
      }
    } catch {
      /* ignore */
    }

    setLoading(null);
    setOpen(false);
  };

  const handleServerExport = async (format: 'xlsx' | 'csv') => {
    if (!serverType) return;
    setLoading(format);

    try {
      const { serverExport } = await import('@/lib/export-utils');
      await serverExport(serverType, format);
    } catch {
      toast('error', 'Gagal mengexport data. Coba lagi nanti.');
    }

    setLoading(null);
    setOpen(false);
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    if (data && headers) {
      handleClientExport(format);
    } else if (serverType) {
      handleServerExport(format);
    }
  };

  const hasExport = (data && headers) || serverType;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled || !hasExport}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-text rounded-lg text-sm hover:bg-surface-variant disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Download size={14} />
        {label}
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-surface border border-border rounded-xl shadow-lg overflow-hidden animate-fade-in-up">
          <div className="p-1">
            <button
              onClick={() => handleExport('xlsx')}
              disabled={loading !== null}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm text-text hover:bg-surface-variant transition disabled:opacity-50"
            >
              {loading === 'xlsx' ? (
                <Loader2 size={16} className="animate-spin text-primary" />
              ) : (
                <FileSpreadsheet size={16} className="text-success" />
              )}
              <span>Excel (.xlsx)</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={loading !== null}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm text-text hover:bg-surface-variant transition disabled:opacity-50"
            >
              {loading === 'csv' ? (
                <Loader2 size={16} className="animate-spin text-primary" />
              ) : (
                <FileText size={16} className="text-primary" />
              )}
              <span>CSV (.csv)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
