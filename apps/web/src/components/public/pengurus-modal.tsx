'use client';

import { X, MapPin, Calendar, Shield } from 'lucide-react';

interface PengurusDetail {
  id: string;
  nama: string;
  jabatan: string;
  fotoPath?: string | null;
  status?: string;
  distrik?: string | null;
  wilayah?: string | null;
  ranting?: string | null;
  nasional?: string | null;
  periode?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function PengurusModal({
  member,
  onClose,
}: {
  member: PengurusDetail;
  onClose: () => void;
}) {
  const initials = getInitials(member.nama);
  const unitName = member.ranting || member.wilayah || member.distrik || member.nasional || '-';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X size={20} className="text-gray-500" />
        </button>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-navy-800 text-white flex items-center justify-center text-3xl font-bold mb-4">
            {initials}
          </div>
          <h2 className="text-xl font-bold text-navy-800 dark:text-white text-center">
            {member.nama}
          </h2>
          <p className="text-sm text-gold-500 font-semibold mt-1">{member.jabatan}</p>
          <span className="text-xs px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium mt-2">
            {member.status || 'Aktif'}
          </span>
        </div>

        {/* Info */}
        <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
          <div className="flex items-center gap-3 text-sm">
            <Shield size={16} className="text-gray-400 shrink-0" />
            <div>
              <span className="text-gray-500 dark:text-gray-400">Unit: </span>
              <span className="font-medium text-navy-800 dark:text-white">{unitName}</span>
            </div>
          </div>

          {member.distrik && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin size={16} className="text-gray-400 shrink-0" />
              <div>
                <span className="text-gray-500 dark:text-gray-400">Distrik: </span>
                <span className="font-medium text-navy-800 dark:text-white">{member.distrik}</span>
              </div>
            </div>
          )}

          {member.wilayah && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin size={16} className="text-gray-400 shrink-0" />
              <div>
                <span className="text-gray-500 dark:text-gray-400">Wilayah: </span>
                <span className="font-medium text-navy-800 dark:text-white">{member.wilayah}</span>
              </div>
            </div>
          )}

          {member.ranting && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin size={16} className="text-gray-400 shrink-0" />
              <div>
                <span className="text-gray-500 dark:text-gray-400">Ranting: </span>
                <span className="font-medium text-navy-800 dark:text-white">{member.ranting}</span>
              </div>
            </div>
          )}

          {member.periode && (
            <div className="flex items-center gap-3 text-sm">
              <Calendar size={16} className="text-gray-400 shrink-0" />
              <div>
                <span className="text-gray-500 dark:text-gray-400">Periode: </span>
                <span className="font-medium text-navy-800 dark:text-white">{member.periode}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
