'use client';

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

// ─── Types ───

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  content?: ReactNode; // Override message with dynamic React node
  duration?: number; // ms, default 5000; 0 = don't auto-dismiss
  action?: ToastAction;
}

interface ToastOptions {
  id?: string; // Pre-set ID (useful when content needs the toast ID)
  duration?: number;
  action?: ToastAction;
  content?: ReactNode;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

// ─── Context ───

const ToastContext = createContext<ToastContextValue>({
  toast: () => '',
  dismissToast: () => {},
});

export const useToast = () => useContext(ToastContext).toast;
export const useDismissToast = () => useContext(ToastContext).dismissToast;

// ─── Icons ───

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-green-500" />,
  error: <AlertCircle size={18} className="text-red-500" />,
  info: <Info size={18} className="text-blue-500" />,
  warning: <AlertTriangle size={18} className="text-amber-500" />,
};

const TOAST_COLORS: Record<ToastType, string> = {
  success: 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800',
  error: 'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800',
  info: 'border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800',
  warning: 'border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800',
};

// ─── Toast Item ───

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const duration = t.duration ?? 5000;

  useEffect(() => {
    if (duration <= 0) return; // duration <= 0 means don't auto-dismiss
    const timer = setTimeout(() => onDismiss(t.id), duration);
    return () => clearTimeout(timer);
  }, [t.id, onDismiss, duration]);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg ${TOAST_COLORS[t.type]} animate-slide-in`}
    >
      <span className="mt-0.5 shrink-0">{TOAST_ICONS[t.type]}</span>
      <div className="text-sm text-gray-800 dark:text-gray-200 flex-1">
        {t.content ?? t.message}
      </div>
      {t.action && (
        <button
          onClick={() => {
            t.action!.onClick();
            onDismiss(t.id);
          }}
          className="shrink-0 text-sm font-medium px-3 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors"
        >
          {t.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(t.id)}
        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Toast Provider ───

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (type: ToastType, message: string, options?: ToastOptions): string => {
      const id = options?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts((prev) => [
        ...prev,
        { id, type, message, content: options?.content, duration: options?.duration, action: options?.action },
      ]);
      return id;
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast, dismissToast }}>
      {children}

      {/* Toast Container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
          ))}
        </div>
      )}

      {/* Toast animation styles */}
      <style jsx global>{`
        @keyframes toast-slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: toast-slide-in 0.3s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
}
