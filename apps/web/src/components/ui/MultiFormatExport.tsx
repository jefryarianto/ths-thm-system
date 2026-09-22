'use client';

export default function MultiFormatExport({
  serverType,
  selectedIds,
}: {
  serverType: string;
  filename?: string;
  selectedIds?: string[];
}) {
  const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    const params = new URLSearchParams({
      type: serverType,
      exportType: format,
    });

    if (selectedIds && selectedIds.length > 0) {
      params.set('ids', selectedIds.join(','));
    }

    const url = `/api/export?${params}`;
    
    if (format === 'pdf') {
      window.open(url, '_blank');
    } else {
      window.location.href = url;
    }
  };

  return (
    <div className="relative group">
      <button className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted hover:bg-surface-variant">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        Export
      </button>

      <div className="absolute right-0 top-full mt-2 bg-surface border border-border rounded-lg shadow-elegant-lg z-50 min-w-[160px] hidden group-hover:block">
        <button
          onClick={() => handleExport('csv')}
          className="block w-full text-left px-4 py-2 text-sm hover:bg-surface-variant flex items-center gap-2"
        >
          <span className="text-xs">📝</span>
          CSV ({selectedIds?.length ? `${selectedIds.length} selected` : 'All'})
        </button>
        <button
          onClick={() => handleExport('xlsx')}
          className="block w-full text-left px-4 py-2 text-sm hover:bg-surface-variant flex items-center gap-2"
        >
          <span className="text-xs">📊</span>
          Excel ({selectedIds?.length ? `${selectedIds.length} selected` : 'All'})
        </button>
        <button
          onClick={() => handleExport('pdf')}
          className="block w-full text-left px-4 py-2 text-sm hover:bg-surface-variant flex items-center gap-2"
        >
          <span className="text-xs">📄</span>
          PDF ({selectedIds?.length ? `${selectedIds.length} selected` : 'All'})
        </button>
      </div>
    </div>
  );
}
