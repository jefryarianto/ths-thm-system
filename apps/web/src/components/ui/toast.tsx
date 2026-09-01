'use client';

import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react';
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
  dismissing?: boolean;
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
  success: <CheckCircle size={20} className="text-emerald-500 dark:text-emerald-400" />,
  error: <AlertCircle size={20} className="text-red-500 dark:text-red-400" />,
  info: <Info size={20} className="text-blue-500 dark:text-blue-400" />,
  warning: <AlertTriangle size={20} className="text-amber-500 dark:text-amber-400" />,
};

const TOAST_STYLES: Record<ToastType, string> = {
  success:
    'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/80',
  error:
    'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/80',
  info:
    'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/80',
  warning:
    'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/80',
};

const TOAST_ICON_BG: Record<ToastType, string> = {
  success: 'bg-emerald-100 dark:bg-emerald-900/60',
  error: 'bg-red-100 dark:bg-red-900/60',
  info: 'bg-blue-100 dark:bg-blue-900/60',
  warning: 'bg-amber-100 dark:bg-amber-900/60',
};

const TOAST_PROGRESS: Record<ToastType, string> = {
  success: 'bg-emerald-500 dark:bg-emerald-400',
  error: 'bg-red-500 dark:bg-red-400',
  info: 'bg-blue-500 dark:bg-blue-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
};

// ─── Toast Item ───

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const duration = t.duration ?? 5000;
  const [progress, setProgress] = useState(100);
  const [dismissing, setDismissing] = useState(false);
  const startRef = useRef(Date.now());
  const pausedRef = useRef(false);
  const pausedAtRef = useRef(0);
  const remainingRef = useRef(duration);

  // Auto-dismiss with progress
  useEffect(() => {
    if (duration <= 0) return; // duration <= 0 means don't auto-dismiss

    const tick = () => {
      if (pausedRef.current) return;
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);

      if (pct <= 0) {
        handleDismiss();
      }
    };

    const interval = setInterval(tick, 50);
    return () => clearInterval(interval);
  }, [t.id, onDismiss, duration]);

  const handleDismiss = useCallback(() => {
    setDismissing(true);
    setTimeout(() => onDismiss(t.id), 250); // wait for exit animation
  }, [onDismiss, t.id]);

  const handleMouseEnter = () => {
    pausedRef.current = true;
    pausedAtRef.current = Date.now();
  };

  const handleMouseLeave = () => {
    // Extend duration by the time we were paused
    const pausedFor = Date.now() - pausedAtRef.current;
    startRef.current += pausedFor;
    pausedRef.current = false;
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border shadow-lg
        backdrop-blur-sm
        ${TOAST_STYLES[t.type]}
        ${dismissing ? 'animate-toast-exit' : 'animate-toast-enter'}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Icon with bg circle */}
        <div className={`shrink-0 p-1.5 rounded-full ${TOAST_ICON_BG[t.type]}`}>
          {TOAST_ICONS[t.type]}
        </div>

        {/* Message */}
        <div className="text-sm font-medium text-gray-800 dark:text-gray-100 flex-1 pt-0.5 leading-relaxed">
          {t.content ?? t.message}
        </div>

        {/* Action button */}
        {t.action && (
          <button
            onClick={() => {
              t.action!.onClick();
              handleDismiss();
            }}
            className="shrink-0 text-sm font-semibold px-3 py-1.5 rounded-lg
              bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
              hover:bg-gray-50 dark:hover:bg-gray-700
              text-gray-800 dark:text-gray-200
              transition-all duration-150 active:scale-95"
          >
            {t.action.label}
          </button>
        )}

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-lg text-gray-400 dark:text-gray-500
            hover:text-gray-600 dark:hover:text-gray-300
            hover:bg-gray-200/50 dark:hover:bg-gray-700/50
            transition-all duration-150"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="h-0.5 w-full bg-gray-200/50 dark:bg-gray-700/50">
          <div
            className={`h-full transition-all duration-75 ease-linear ${TOAST_PROGRESS[t.type]}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Toast Provider ───

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Dedup: track recent toast messages to prevent spam
  const recentMessages = useRef(new Map<string, number>());

  const addToast = useCallback(
    (type: ToastType, message: string, options?: ToastOptions): string => {
      const id = options?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      // Dedup: skip if same message was shown within last 3 seconds
      const dedupKey = options?.id ? `id:${options.id}` : `${type}:${message}`;
      const lastShown = recentMessages.current.get(dedupKey);
      if (lastShown && Date.now() - lastShown < 3000) {
        return id; // silently skip duplicate
      }
      recentMessages.current.set(dedupKey, Date.now());

      // Limit max visible toasts to 3
      setToasts((prev) => {
        const next = [
          ...prev,
          {
            id,
            type,
            message,
            content: options?.content,
            duration: options?.duration,
            action: options?.action,
          },
        ];
        return next.length > 3 ? next.slice(-3) : next;
      });
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

      {/* Toast Container — center of screen */}
      {toasts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col gap-3 max-w-sm w-full px-4 pointer-events-auto">
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
            ))}
          </div>
        </div>
      )}

      {/* Toast animation styles */}
      <style jsx global>{`
        @keyframes toast-enter {
          from {
            transform: translateY(-12px) scale(0.96);
            opacity: 0;
            filter: blur(4px);
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
            filter: blur(0);
          }
        }
        @keyframes toast-exit {
          from {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          to {
            transform: translateY(-8px) scale(0.96);
            opacity: 0;
            filter: blur(4px);
          }
        }
        .animate-toast-enter {
          animation: toast-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-toast-exit {
          animation: toast-exit 0.25s cubic-bezier(0.4, 0, 1, 1) forwards;
        }
      `}</style>
    </ToastContext.Provider>
  );
}
