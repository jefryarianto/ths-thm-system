'use client';

import * as XLSX from 'xlsx';

/**
 * Format a value for CSV: wrap in quotes if contains comma, quote, or newline.
 */
function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format a value for display in export (dates, booleans, etc.)
 */
function formatExportValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'Ya' : 'Tidak';
  if (val instanceof Date) return val.toISOString().split('T')[0];
  return String(val);
}

/**
 * Convert an array of objects to CSV string with BOM for Excel compatibility.
 */
export function toCsv(data: Record<string, unknown>[], headers: string[]): string {
  // BOM for UTF-8 Excel compatibility
  const BOM = '\uFEFF';
  const headerRow = headers.map(csvEscape).join(',');
  const dataRows = data.map((row) =>
    headers.map((h) => csvEscape(formatExportValue(row[h]))).join(','),
  );
  return BOM + [headerRow, ...dataRows].join('\n');
}

/**
 * Trigger a browser file download from string content.
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Convert data to XLSX and trigger download.
 */
export function downloadXlsx(
  data: Record<string, unknown>[],
  headers: string[],
  filename: string,
): void {
  const sheetData = data.map((row) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h) => {
      obj[h] = formatExportValue(row[h]);
    });
    return obj;
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: headers });

  // Auto-fit column widths
  const colWidths = headers.map((h) => {
    const maxDataLen = sheetData.reduce((max, row) => {
      const val = String(row[h] || '');
      return Math.max(max, val.length);
    }, 0);
    return { wch: Math.max(h.length * 2, Math.min(maxDataLen + 2, 40)) };
  });
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Export data via server-side endpoint (for full dataset, not just displayed page).
 * Falls back to client-side export for the specific type.
 */
export async function serverExport(type: string, format: 'xlsx' | 'csv' = 'xlsx'): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const url = `${baseUrl}/api/reports/export/${type}?format=${format}&t=${Date.now()}`;
  const token = localStorage.getItem('accessToken');

  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) throw new Error('Export failed');

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${type}-export-${new Date().toISOString().slice(0, 10)}.${format}`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Fallback to show error - the component will handle this
    throw new Error('Gagal mengexport data. Coba lagi nanti.');
  }
}
