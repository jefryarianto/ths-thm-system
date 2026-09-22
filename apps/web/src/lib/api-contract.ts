/**
 * API Contract for Members Page Endpoints
 * 
 * Use this to ensure type-safe API calls.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type MemberStatus = 'aktif' | 'nonaktif' | 'pindah' | 'keluar' | 'meninggal';
export type DataStatus = 'complete' | 'incomplete';
export type ValidasiStatus = 'pending' | 'approved' | 'rejected';

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface DateRange {
  from?: string;
  to?: string;
}

// ─── Request Types ───────────────────────────────────────────────────────────

export interface GetMembersParams {
  page?: number;
  limit?: number;
  search?: string;
  
  // Filters
  statusKeanggotaan?: MemberStatus;
  statusData?: DataStatus;
  statusValidasi?: ValidasiStatus;
  distrikId?: string;
  wilayahId?: string;
  rantingId?: string;
  
  // Sort
  sort?: string;
  order?: 'asc' | 'desc';
  
  // Date range
  dadarFrom?: string;
  dadarTo?: string;
}

export interface BatchActionRequest {
  memberIds: string[];
  action: 'approve' | 'reject' | 'suspend' | 'reactivate' | 'remove';
}

export interface PrintBatchRequest {
  memberIds: string[];
  reason: 'baru' | 'ganti' | 'hanya';
}

export interface ExportParams {
  type: 'members' | 'dues' | 'reports';
  exportType: 'csv' | 'xlsx' | 'pdf';
  ids?: string; // CSV-separated member IDs
}

// ─── Response Types ──────────────────────────────────────────────────────────

export interface BatchActionResponse {
  success: string[];
  failed: string[];
}

export interface PrintBatchResponse {
  issued: number;
  pdfUrl: string;
}

// ─── API Client Functions ────────────────────────────────────────────────────

/**
 * Get members with pagination, sorting, and filtering
 */
export async function getMembers(params: GetMembersParams): Promise<{
  data: any[];
  meta: {
    total: number;
    totalPages: number;
    page: number;
  };
}> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const response = await fetch(`/api/members?${searchParams.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch members');
  }

  return response.json();
}

/**
 * Perform batch action on multiple members
 */
export async function batchAction(request: BatchActionRequest): Promise<BatchActionResponse> {
  const response = await fetch('/api/members/batch-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Batch action failed');
  }

  return response.json();
}

/**
 * Print cards for multiple members
 */
export async function printBatch(request: PrintBatchRequest): Promise<PrintBatchResponse> {
  const response = await fetch('/api/members/print-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Print batch failed');
  }

  return response.json();
}

/**
 * Get export URL for members
 */
export function getExportUrl(params: ExportParams): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, String(value));
  });

  return `/api/export?${searchParams.toString()}`;
}

/**
 * Export members to CSV
 */
export async function exportMembersCSV(ids?: string[]): Promise<void> {
  const params: ExportParams = {
    type: 'members',
    exportType: 'csv',
  };
  
  if (ids && ids.length > 0) {
    params.ids = ids.join(',');
  }

  const url = getExportUrl(params);
  window.location.href = url;
}

/**
 * Export members to Excel
 */
export async function exportMembersExcel(ids?: string[]): Promise<void> {
  const params: ExportParams = {
    type: 'members',
    exportType: 'xlsx',
  };
  
  if (ids && ids.length > 0) {
    params.ids = ids.join(',');
  }

  const url = getExportUrl(params);
  window.location.href = url;
}

/**
 * Open members PDF in new tab
 */
export async function exportMembersPDF(ids?: string[]): Promise<void> {
  const params: ExportParams = {
    type: 'members',
    exportType: 'pdf',
  };
  
  if (ids && ids.length > 0) {
    params.ids = ids.join(',');
  }

  const url = getExportUrl(params);
  window.open(url, '_blank');
}
