'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const variantStyles = {
  danger: {
    icon: 'text-error-600 bg-error-100 dark:bg-error-950',
    button: 'bg-error hover:bg-error-700 focus:ring-error',
  },
  warning: {
    icon: 'text-warning-600 bg-warning-100 dark:bg-warning-950',
    button: 'bg-warning hover:bg-warning-700 focus:ring-warning',
  },
  info: {
    icon: 'text-info-600 bg-info-100 dark:bg-info-950',
    button: 'bg-info hover:bg-info-700 focus:ring-info',
  },
};

export interface ConfirmOptions {
  /** Shown as the modal heading (default: "Konfirmasi") */
  title?: string;
  /** Shown as the modal body */
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmModalProps['variant'];
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({ open: false, options: { message: '' }, resolve: null });

  /**
   * Promise-based confirmation - mirrors the native `confirm()` API but renders
   * an in-app modal. Accepts a plain message string or an options object.
   *
   *   const ok = await confirm('Hapus item ini?');
   *   const ok = await confirm({ title: 'Verifikasi', message: '...', confirmLabel: 'Ya, Verifikasi', variant: 'warning' });
   */
  const confirm = (options: string | ConfirmOptions): Promise<boolean> => {
    const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
    return new Promise((resolve) => {
      setState({ open: true, options: opts, resolve });
    });
  };

  const handleConfirm = () => {
    state.resolve?.(true);
    setState({ open: false, options: { message: '' }, resolve: null });
  };

  const handleCancel = () => {
    state.resolve?.(false);
    setState({ open: false, options: { message: '' }, resolve: null });
  };

  return {
    confirm,
    confirmModal: (
      <ConfirmModal
        open={state.open}
        title={state.options.title ?? 'Konfirmasi'}
        message={state.options.message}
        confirmLabel={
          state.options.confirmLabel ?? (state.options.variant === 'danger' ? 'Ya, Hapus' : 'Ya')
        }
        cancelLabel={state.options.cancelLabel}
        variant={state.options.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
  };
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Ya, Hapus',
  cancelLabel = 'Batal',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const styles = variantStyles[variant];

  if (!open) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-surface rounded-xl shadow-2xl max-w-md w-full p-6 animate-modal-in">
        <button
          onClick={onCancel}
          aria-label="Tutup konfirmasi"
          className="absolute top-4 right-4 text-muted hover:text-text transition-colors"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-full shrink-0 ${styles.icon}`} aria-hidden="true">
            <AlertTriangle size={22} />
          </div>
          <div className="flex-1">
            <h3 id="confirm-title" className="text-lg font-semibold text-text">{title}</h3>
            <p id="confirm-message" className="mt-2 text-sm text-muted">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-text bg-surface-variant hover:bg-muted/20 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 ${styles.button}`}
          >
            {loading && (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes modal-in {
          from {
            transform: scale(0.95) translateY(10px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        .animate-modal-in {
          animation: modal-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}