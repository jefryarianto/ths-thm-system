'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { useConfirm } from '@/components/ui/confirm-modal';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { usePaginatedList } from '@/lib/hooks/use-api';
import type { Member } from '@/types';
import {

  Mail,
  Send,
  CheckCircle2,
  Users,
  RefreshCw,
} from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import DataTable from '@/components/ui/data-table';
import { formatDate, toProperCase } from '@/components/members/constants';
import { useToast } from '@/components/ui/toast';

export default function IncompleteMembersPage() {
  const { confirm, confirmModal } = useConfirm();
  const router = useRouter();
  const toast = useToast();
  const [sendingAll, setSendingAll] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; noEmail: number } | null>(null);

  const {
    data: members,
    meta,
    loading,
    error,
    refetch,
  } = usePaginatedList<Member>(() =>
    apiClient
      .get('/members', { params: { statusData: 'incomplete', limit: 50 } })
      .then((r) => r.data),
    [],
  );

  const formatTtl = (m: Member) => {
    const parts = [m.tempatLahir, m.tanggalLahir ? formatDate(m.tanggalLahir) : null].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const formatDadar = (m: Member) => {
    if (m.tempatDadar && m.tahunDadar) return `${m.tempatDadar} - ${m.tahunDadar}`;
    if (m.tempatDadar || m.tahunDadar) return m.tempatDadar || m.tahunDadar;
    return '-';
  };

  const handleSendAllNotifications = async () => {
    if (!(await confirm({ title: 'Kirim Notifikasi', message: 'Kirim notifikasi ke semua anggota dengan data belum lengkap?', confirmLabel: 'Ya, Kirim', variant: 'info' }))) return;
    setSendingAll(true);
    setSendResult(null);
    try {
      const { data: res } = await apiClient.post('/notifications/send-incomplete', {});
      setSendResult(res.data || { sent: 0, noEmail: 0 });
    } catch {
       toast('error', 'Gagal mengirim notifikasi');
    }
    setSendingAll(false);
  };

  const handleSendNotification = async (memberId: string, email: string | null) => {
    if (!email) {
      toast('error', 'Anggota ini tidak memiliki alamat email');
      return;
    }
    try {
      await apiClient.post(`/members/${memberId}/validate`, {});
      await apiClient.post('/notifications/send-incomplete', { memberIds: [memberId] });
      refetch();
    } catch {
       toast('error', 'Gagal mengirim notifikasi');
    }
  };

  const columns = [
    {
      key: 'namaLengkap',
      label: 'Nama',
      render: (m: Member) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
            <img src="/logo.svg" alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <Link
              href={`/members/${m.id}`}
              className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition"
              title="Lihat detail anggota"
            >
              {toProperCase(m.namaLengkap)}
            </Link>
            <span className="ml-2 font-mono text-xs text-gray-400">{m.nomorAnggota}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'missingFields',
      label: 'Field Kurang',
      render: (m: Member) => (
        <div className="flex flex-wrap gap-1">
          {(m.missingFields as string[] | null)?.map((f) => (
            <span
              key={f}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
            >
              {f.replace(/_/g, ' ')}
            </span>
          )) || (
            <span className="text-xs text-gray-400">Tidak diketahui</span>
          )}
        </div>
      ),
    },
    {
      key: 'ttl',
      label: 'TTL',
      hidden: 'hidden md:table-cell',
      render: (m: Member) => (
        <span className="text-xs text-gray-500">{formatTtl(m)}</span>
      ),
    },
    {
      key: 'dadar',
      label: 'Tempat - Tahun Dadar',
      hidden: 'hidden lg:table-cell',
      render: (m: Member) => (
        <span className="text-xs text-gray-500">{formatDadar(m)}</span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      hidden: 'hidden lg:table-cell',
      render: (m: Member) => (
        <span className="text-xs text-gray-500">{m.email || '-'}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Notifikasi',
      render: (m: Member) => (
        <button
          onClick={() => handleSendNotification(m.id, m.email)}
          disabled={!m.email}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
            m.email
              ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-700'
          }`}
          title={m.email ? 'Kirim notifikasi' : 'Tidak ada email'}
        >
          <Send size={12} />
          Kirim
        </button>
      ),
    },
  ];

  return (
      <PermissionGuard module="members" action="view">
        <PageContainer>
              <PageHeader
                title="Data Belum Lengkap"
                onRefresh={refetch}
              >
                <button
                  onClick={handleSendAllNotifications}
                  disabled={sendingAll || members.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {sendingAll ? (
                    <><RefreshCw size={14} className="animate-spin" /> Mengirim...</>
                  ) : (
                    <><Mail size={14} /> Kirim Semua Notifikasi</>
                  )}
                </button>
              </PageHeader>
        
              {sendResult && (
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl">
                  <CheckCircle2 size={20} className="text-green-600 shrink-0" />
                  <div className="text-sm text-green-700 dark:text-green-400">
                    Notifikasi terkirim ke <strong>{sendResult.sent}</strong> anggota.
                    {sendResult.noEmail > 0 && (
                      <span className="ml-1">
                        {sendResult.noEmail} anggota tanpa email dilewati.
                      </span>
                    )}
                  </div>
                </div>
              )}
        
              {error && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}
        
              <DataTable
                columns={columns}
                data={members}
                loading={loading}
                empty={{
                  icon: Users,
                  message: 'Semua anggota sudah memiliki data lengkap',
                  action: { label: 'Ke Daftar Anggota', onClick: () => router.push('/members') },
                }}
                page={1}
                totalPages={meta.totalPages}
                total={meta.total}
                onPageChange={(_p) => {}}
              />
              {confirmModal}
            </PageContainer>
      </PermissionGuard>
    );
}
