'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Edit, Trash2, CheckCircle2, MoreVertical, Eye, UserCheck } from 'lucide-react';
import ConfirmModal from '@/components/ui/confirm-modal';
import { useToast } from '@/components/ui/toast';

interface CandidateActionsProps {
  candidate: {
    id: string;
    namaLengkap: string;
    status: string;
  };
  onSuccess: () => void;
}

export default function CandidateActions({ candidate, onSuccess }: CandidateActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const toggleMenu = () => {
    if (!showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuStyle({
        position: 'fixed' as const,
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
        zIndex: 50,
      });
    }
    setShowMenu(!showMenu);
  };

  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      await apiClient.post(`/candidates/${candidate.id}/approve`, {});
      toast('success', `${candidate.namaLengkap} disetujui menjadi anggota`);
      onSuccess();
    } catch {
      toast('error', 'Gagal menyetujui calon anggota');
    }
    setActionLoading(null);
  };

  const handleDelete = async () => {
    setActionLoading('delete');
    try {
      await apiClient.delete(`/candidates/${candidate.id}`);
      toast('success', 'Calon anggota berhasil dihapus');
      setShowDeleteModal(false);
      onSuccess();
    } catch {
      toast('error', 'Gagal menghapus calon anggota');
    }
    setActionLoading(null);
  };

  const menuItems = [
    {
      label: 'Lihat Detail',
      icon: Eye,
      action: () => router.push(`/candidates/${candidate.id}`),
      disabled: false,
    },
    {
      label: 'Edit',
      icon: Edit,
      action: () => router.push(`/candidates/${candidate.id}`),
      disabled: false,
    },
    ...(candidate.status === 'diusulkan'
      ? [{
          label: 'Setujui',
          icon: CheckCircle2,
          action: handleApprove,
          disabled: actionLoading === 'approve',
        }]
      : []),
    {
      label: 'Hapus',
      icon: Trash2,
      action: () => setShowDeleteModal(true),
      danger: true,
      disabled: actionLoading === 'delete',
    },
  ];

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {candidate.status === 'diusulkan' && (
          <button
            onClick={handleApprove}
            disabled={actionLoading === 'approve'}
            className="p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950 transition disabled:opacity-30"
            title="Setujui"
          >
            <UserCheck size={14} className="text-emerald-600" />
          </button>
        )}
        <button
          onClick={() => router.push(`/candidates/${candidate.id}`)}
          className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition"
          title="Detail"
        >
          <Eye size={14} className="text-blue-600" />
        </button>
        <div>
          <button
            ref={buttonRef}
            onClick={toggleMenu}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <MoreVertical size={14} className="text-gray-400" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div
                style={menuStyle}
                className="w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1"
              >
                {menuItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => { if (!item.disabled) { setShowMenu(false); item.action(); } }}
                    disabled={item.disabled}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      item.danger ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
                    } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <item.icon size={14} />
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        open={showDeleteModal}
        title="Hapus Calon Anggota"
        message={`Apakah Anda yakin ingin menghapus "${candidate.namaLengkap}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  );
}
