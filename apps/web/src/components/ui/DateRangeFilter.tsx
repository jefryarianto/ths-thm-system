'use client';

export default function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        placeholder="Dari"
        className="px-2 py-1 text-xs border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <span className="text-xs text-muted">—</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        placeholder="Sampai"
        className="px-2 py-1 text-xs border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {from || to ? (
        <button
          onClick={() => {
            onFromChange('');
            onToChange('');
          }}
          className="ml-1 text-2xs text-primary hover:underline"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
