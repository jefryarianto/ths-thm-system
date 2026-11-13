'use client';

import { AlertCircle, Lock, AlertTriangle } from 'lucide-react';

interface DuesLockBannerProps {
  lockInfo: {
    isLocked: boolean;
    lockedCount: number;
    graceDaysRemaining: number;
    gracePeriodType: 'standard' | 'extended' | 'override';
    lockedBy?: string | null;
    lockedAt?: Date | null;
    lockReason?: string | null;
    expiresAt?: Date | null;
    periode: string;
  };
  onRequestOverride?: () => void;
}

export function DuesLockBanner({ lockInfo, onRequestOverride }: DuesLockBannerProps) {
  if (!lockInfo.isLocked) return null;

  const getConfig = () => {
    switch (lockInfo.gracePeriodType) {
      case 'standard':
        return {
          icon: AlertTriangle,
          color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          iconColor: 'text-yellow-600',
          title: 'Periode Iuran Terkunci',
          subtitle: 'Masa tenggang standar 7 hari',
        };
      case 'extended':
        return {
          icon: AlertCircle,
          color: 'bg-orange-50 border-orange-200 text-orange-800',
          iconColor: 'text-orange-600',
          title: 'Periode Iuran Terkunci (Diperpanjang)',
          subtitle: `Masa tenggang diperpanjang: ${lockInfo.graceDaysRemaining} hari lagi`,
        };
      case 'override':
        return {
          icon: Lock,
          color: 'bg-red-50 border-red-200 text-red-800',
          iconColor: 'text-red-600',
          title: 'Periode Iuran Dikunci (Override)',
          subtitle: 'Diperlukan unlock manual oleh admin',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  const formatDate = (date?: Date | null) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`mb-4 p-4 rounded-lg border ${config.color}`} role="alert">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={`${config.iconColor} w-5 h-5`} aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold">{config.title}</h4>
          <p className="text-sm mt-1">
            Periode <strong>{lockInfo.periode}</strong> terkunci. {config.subtitle}.
          </p>
          {lockInfo.lockedBy && (
            <p className="text-sm mt-2">
              Terkunci oleh <strong>{lockInfo.lockedBy}</strong> pada{' '}
              {formatDate(lockInfo.lockedAt)}.
            </p>
          )}
          {lockInfo.expiresAt && lockInfo.gracePeriodType !== 'override' && (
            <p className="text-sm mt-1">
              Akan otomatis unlock pada <strong>{formatDate(lockInfo.expiresAt)}</strong>.
            </p>
          )}
          {lockInfo.lockReason && (
            <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
              Alasan: {lockInfo.lockReason}
            </p>
          )}
        </div>
        {lockInfo.gracePeriodType !== 'standard' && onRequestOverride && (
          <button
            onClick={onRequestOverride}
            className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ajukan Pengecualian
          </button>
        )}
      </div>
    </div>
  );
}
