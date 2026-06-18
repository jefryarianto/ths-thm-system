'use client';

import { useState } from 'react';
import {
  CheckCircle2, Shield, UserX, Eye, MoreVertical, Edit, Trash2,
  IdCard, FileText
} from 'lucide-react';

interface MemberActionsProps {
  member: {
    id: string;
    statusValidasi: string;
    statusKeanggotaan: string;
  };
  actionLoading: string | null;
  onAction: (id: string, action: string) => void;
  onViewDetail: (id: string) => void;
}

export default function MemberActions({
  member,
  actionLoading,
  onAction,
  onViewDetail,
}: MemberActionsProps) {
  const [showMenu, setShowMenu] = useState(false);

  const menuItems = [
    { label: 'Lihat Detail', icon: Eye, action: () => onViewDetail(member.id) },
    { label: 'Edit Anggota', icon: Edit, action: () => onViewDetail(member.id) },
    { label: 'Kartu Digital (KTA)', icon: IdCard, action: () => window.open(`/members/${member.id}?tab=card`, '_blank') },
    { label: 'Dokumen', icon: FileText, action: () => onViewDetail(member.id) },
    ...(member.statusValidasi === 'pending'
      ? [{ label: 'Setujui', icon: CheckCircle2, action: () => onAction(member.id, 'approve') }]
      : []),
    ...(member.statusKeanggotaan === 'aktif'
      ? [{ label: 'Nonaktifkan', icon: UserX, action: () => onAction(member.id, 'suspend') }]
      : member.statusKeanggotaan === 'nonaktif'
        ? [{ label: 'Aktifkan', icon: Shield, action: () => onAction(member.id, 'reactivate') }]
        : []),
    { label: 'Hapus', icon: Trash2, action: () => onAction(member.id, 'remove'), danger: true },
  ];

  return (
    <div className="flex items-center justify-end gap-1">
      {member.statusValidasi === 'pending' && (
        <button
          onClick={() => onAction(member.id, 'approve')}
          disabled={actionLoading === member.id}
          className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-950 transition disabled:opacity-30"
          title="Setujui"
        >
          <CheckCircle2 size={14} className="text-green-600" />
        </button>
      )}
      <button
        onClick={() => onViewDetail(member.id)}
        className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition"
        title="Detail"
      >
        <Eye size={14} className="text-blue-600" />
      </button>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <MoreVertical size={14} className="text-gray-400" />
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1">
              {menuItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => { setShowMenu(false); item.action(); }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    item.danger ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
                  }`}
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
  );
}