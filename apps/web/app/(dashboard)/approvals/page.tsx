'use client';
import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import SummaryBar from '@/components/ui/summary-bar';

interface ApprovalLevel {
  status: string;
  approvalLevel?: { name: string };
}

interface ApprovalRequest {
  id: string;
  requestType: string;
  itemId: string;
  createdAt: string;
  levels?: ApprovalLevel[];
}

const statusColors: Record<string, string> = {
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
};

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/approvals/pending');
      if (data.success) setRequests(data.data || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(`${id}-${action}`);
    try {
      await apiClient.post(`/approvals/${id}/${action}`);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      /* ignore */
    }
    setActionLoading(null);
  };

  return (
    <PermissionGuard module="approvals" action="view">
    <PageContainer>
      <PageHeader title="Persetujuan" onRefresh={fetchPending} />

      <SummaryBar
        icon={Clock}
        label="Menunggu Persetujuan"
        total={requests.length}
        onRefresh={fetchPending}
      />

      {loading ? (
        <div className="text-center py-16 text-gray-500">Memuat...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Tidak ada pengajuan yang menunggu</p>
          <p className="text-sm text-gray-400 mt-1">Semua pengajuan telah diproses</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="p-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full font-medium">
                      {req.requestType}
                    </span>
                    <span className="text-xs text-gray-400">
                      Diajukan: {new Date(req.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                    ID: {req.itemId}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAction(req.id, 'approve')}
                    disabled={actionLoading === `${req.id}-approve`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {actionLoading === `${req.id}-approve` ? (
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    Setujui
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'reject')}
                    disabled={actionLoading === `${req.id}-reject`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {actionLoading === `${req.id}-reject` ? (
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <XCircle size={16} />
                    )}
                    Tolak
                  </button>
                </div>
              </div>

              {req.levels && req.levels.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex flex-wrap gap-2">
                    {req.levels.map((l, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full ${
                          statusColors[l.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {l.status === 'approved' && <CheckCircle size={12} />}
                        {l.status === 'rejected' && <XCircle size={12} />}
                        {l.status === 'pending' && <AlertTriangle size={12} />}
                        <span>
                          {l.approvalLevel?.name || `Level ${i + 1}`}: {l.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageContainer>
    </PermissionGuard>
  );
}