'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Edit, Trash2, MoreVertical } from 'lucide-react';
import ConfirmModal from '@/components/ui/confirm-modal';
import { useToast } from '@/components/ui/toast';

interface ActivityActionsProps {
  activity: {
    id: string;
    nama: string;
  };
  onSuccess: () => void;
}

export default function ActivityActions({ activity, onSuccess }: ActivityActionsProps) {
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

  const handleDelete = async () => {
    setActionLoading('delete');
    try {
      await apiClient.delete(`/activities/${activity.id}`);
      toast('success', 'Kegiatan berhasil dihapus');
      setShowDeleteModal(false);
      onSuccess();
    } catch {
      toast('error', 'Gagal menghapus kegiatan');
    }
    setActionLoading(null);
  };

  const menuItems = [
    {
      label: 'Edit',
      icon: Edit,
      action: () => router.push(`/activities/new?id=${activity.id}`),
      disabled: false,
    },
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
        title="Hapus Kegiatan"
        message={`Apakah Anda yakin ingin menghapus kegiatan "${activity.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  );
}
