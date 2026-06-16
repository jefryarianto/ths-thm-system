'use client';

import { CheckCircle2, Shield, UserX, Eye, MoreVertical } from 'lucide-react';

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
      {member.statusKeanggotaan === 'aktif' ? (
        <button
          onClick={() => onAction(member.id, 'suspend')}
          disabled={actionLoading === member.id}
          className="p-1.5 rounded hover:bg-yellow-50 dark:hover:bg-yellow-950 transition disabled:opacity-30"
          title="Nonaktifkan"
        >
          <UserX size={14} className="text-yellow-600" />
        </button>
      ) : member.statusKeanggotaan === 'nonaktif' ? (
        <button
          onClick={() => onAction(member.id, 'reactivate')}
          disabled={actionLoading === member.id}
          className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-950 transition disabled:opacity-30"
          title="Aktifkan kembali"
        >
          <Shield size={14} className="text-green-600" />
        </button>
      ) : null}
      <button
        onClick={() => onViewDetail(member.id)}
        className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition"
        title="Detail"
      >
        <Eye size={14} className="text-blue-600" />
      </button>
      <div className="relative group">
        <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition">
          <MoreVertical size={14} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
}
