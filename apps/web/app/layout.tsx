import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

// Import ErrorBoundary from @sentry/nextjs — declared dependency, always
// available at build time.  The component is <3 KB and is tree-shaken
// by webpack's dead-code elimination when NEXT_PUBLIC_SENTRY_DSN is
// not set at build time.
//
// Do NOT use dynamic() or conditional require() here — both cause
// either hydration mismatches (dynamic + ssr:false) or violate
// React 19's component-purity rules (require() inside render).
import { ErrorBoundary as SentryErrorBoundary } from '@sentry/nextjs';

export const metadata: Metadata = {
  title: 'THS-THM System Manajemen',
  description: 'Sistem Manajemen THS-THM (Taman Harapan Siswa / Taman Harapan Murid)',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-icon.png',
  },
};

function ErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
      <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
        <div className="mb-4 text-6xl">⚠️</div>
        <h1 className="mb-2 text-xl font-semibold text-gray-900">Terjadi Kesalahan</h1>
        <p className="mb-6 text-sm text-gray-500">
          Maaf, aplikasi mengalami kesalahan yang tidak terduga.
          Tim teknis kami telah diberitahu secara otomatis.
        </p>
        <button
          onClick={resetError}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

  let content = (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );

  // Only wrap with Sentry ErrorBoundary when DSN is configured
  // Without DSN the ErrorBoundary import is dead code → tree-shaken
  if (SENTRY_DSN) {
    content = <SentryErrorBoundary fallback={ErrorFallback}>{content}</SentryErrorBoundary>;
  }

  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased">{content}</body>
    </html>
  );
}
