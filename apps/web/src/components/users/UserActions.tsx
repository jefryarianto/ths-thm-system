'use client';

import { useState, useRef } from 'react';
import { MoreVertical, Edit, UserX, UserCheck, Trash2 } from 'lucide-react';

interface UserActionsProps {
  user: {
    id: string;
    isActive: boolean;
  };
  actionLoading?: string | null;
  onEdit: (id: string) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
}

export default function UserActions({ user, actionLoading, onEdit, onToggleActive, onDelete }: UserActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const isLoading = actionLoading === user.id;

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

  const menuItems = [
    { label: 'Edit User', icon: Edit, action: () => onEdit(user.id), disabled: false },
    {
      label: user.isActive ? 'Nonaktifkan' : 'Aktifkan',
      icon: user.isActive ? UserX : UserCheck,
      action: () => onToggleActive(user.id, user.isActive),
      disabled: isLoading,
    },
    { label: 'Hapus', icon: Trash2, action: () => onDelete(user.id), danger: true, disabled: isLoading },
  ];

  return (
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
  );
}