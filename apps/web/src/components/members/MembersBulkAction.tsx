'use client';

import { useCallback } from 'react';
import { CheckCircle2, X, Printer, Download } from 'lucide-react';

interface MembersBulkActionProps {
  selectedIds: string[];
  onClear: () => void;
  onApprove: () => void;
  onPrint: () => void;
  isApproveLoading: boolean;
  isPrintLoading: boolean;
}

export default function MembersBulkAction({
  selectedIds,
  onClear,
  onApprove,
  onPrint,
  isApproveLoading,
  isPrintLoading,
}: MembersBulkActionProps) {
  const handleExport = useCallback(() => {
    const params = new URLSearchParams({
      type: 'members',
      exportType: 'csv',
    });
    if (selectedIds.length > 0) {
      params.set('ids', selectedIds.join(','));
    }
    window.location.href = `/api/export?${params}`;
  }, [selectedIds]);

  if (selectedIds.length === 0) return null;

  return (
    <div className="p-4 bg-primary-50 dark:bg-primary-950/50 border-y border-primary-200 dark:border-primary-800">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
            {selectedIds.length} anggota dipilih
          </span>
          <button
            onClick={onClear}
            className="p-1.5 hover:bg-surface-variant rounded transition-colors"
            title="Clear selection"
            aria-label="Clear selection"
          >
            <X size={16} className="text-primary-700 dark:text-primary-300" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onApprove}
            disabled={isApproveLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApproveLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                Setujui
              </>
            )}
          </button>
          <button
            onClick={onPrint}
            disabled={isPrintLoading}
            className="p-2 hover:bg-surface-variant rounded-lg transition-colors"
            title="Print cards"
            aria-label="Print cards"
          >
            <Printer size={16} className="text-primary-700 dark:text-primary-300" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 hover:bg-surface-variant rounded-lg transition-colors"
            title="Export to CSV"
            aria-label="Export"
          >
            <Download size={16} className="text-primary-700 dark:text-primary-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
