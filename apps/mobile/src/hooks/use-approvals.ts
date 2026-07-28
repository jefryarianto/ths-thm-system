import apiClient, { unwrap, ApiResponse } from '../lib/api-client';
import { useApi } from './use-api';

export interface ApprovalLevel {
  id: string;
  requestId: string;
  approvalLevelId: string;
  status: string;
  decidedBy: string | null;
  decidedAt: string | null;
  note: string | null;
  approvalLevel: {
    id: string;
    name: string;
    order: number;
    roleName: string;
  };
}

export interface ApprovalRequest {
  id: string;
  requestType: string;
  itemId: string;
  status: string;
  submittedBy: string | null;
  createdAt: string;
  completedAt: string | null;
  levels: ApprovalLevel[];
}

export const REQUEST_TYPE_FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'member_create', label: 'Anggota' },
  { value: 'candidate_create', label: 'Calon' },
  { value: 'claim', label: 'Klaim' },
  { value: 'letter', label: 'Surat' },
  { value: 'certificate', label: 'Sertifikat' },
];

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  member_create: 'Pembuatan Anggota',
  member_update: 'Perubahan Data Anggota',
  candidate_create: 'Pendaftaran Calon',
  candidate_update: 'Perubahan Data Calon',
  claim: 'Klaim',
  letter: 'Surat',
  certificate: 'Sertifikat',
};

export const REQUEST_TYPE_ICONS: Record<string, string> = {
  member_create: 'person-add',
  member_update: 'create',
  candidate_create: 'people',
  candidate_update: 'people',
  claim: 'document-text',
  letter: 'mail',
  certificate: 'ribbon',
};

export const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Menunggu', color: '#b45309', bg: '#fef3c7' },
  approved: { label: 'Disetujui', color: '#166534', bg: '#dcfce7' },
  rejected: { label: 'Ditolak', color: '#991b1b', bg: '#fee2e2' },
};

export function usePendingApprovals() {
  return useApi<ApprovalRequest[]>(
    () =>
      apiClient
        .get('/approvals/pending')
        .then((r) => (unwrap(r) ?? []) as ApprovalRequest[]),
    [],
  );
}

export function useApprovalDetail(id: string) {
  return useApi<ApprovalRequest>(
    () =>
      apiClient
        .get(`/approvals/${id}`)
        .then((r) => (unwrap(r) ?? null) as ApprovalRequest),
    [id],
  );
}

/**
 * Reference route configuration for navigating from approval detail
 * to the actual data being referenced (member, claim, letter, certificate).
 */
export interface ReferenceRoute {
  pathname: string;
  params: Record<string, string>;
  label: string;
  icon: string;
}

/**
 * Get navigation target for the item referenced by an approval request.
 * - member_create / member_update → members/[id] (existing screen)
 * - claim → approvals/reference-claim (new screen)
 * - letter → letters/[id] (existing screen)
 * - certificate → documents/[id] (existing screen)
 */
export function getReferenceRoute(approval: ApprovalRequest): ReferenceRoute | null {
  switch (approval.requestType) {
    case 'member_create':
    case 'member_update':
      return {
        pathname: '/approvals/reference-member',
        params: { id: approval.itemId },
        label: 'Lihat Detail Anggota',
        icon: 'person',
      };
    case 'claim':
      return {
        pathname: '/approvals/reference-claim',
        params: { id: approval.itemId },
        label: 'Lihat Detail Klaim',
        icon: 'document-text',
      };
    case 'letter':
      return {
        pathname: '/approvals/reference-letter',
        params: { id: approval.itemId },
        label: 'Lihat Detail Surat',
        icon: 'mail',
      };
    case 'candidate_create':
    case 'candidate_update':
      return {
        pathname: '/approvals/reference-candidate',
        params: { id: approval.itemId },
        label: 'Lihat Detail Calon',
        icon: 'people',
      };
    case 'certificate':
      return {
        pathname: '/approvals/reference-document',
        params: { id: approval.itemId },
        label: 'Lihat Sertifikat',
        icon: 'ribbon',
      };
    default:
      return null;
  }
}

export async function approveApproval(id: string, note?: string) {
  const { data } = await apiClient.post(`/approvals/${id}/approve`, { note: note || undefined });
  return data as ApiResponse<unknown>;
}

export async function rejectApproval(id: string, note?: string) {
  const { data } = await apiClient.post(`/approvals/${id}/reject`, { note: note || undefined });
  return data as ApiResponse<unknown>;
}
