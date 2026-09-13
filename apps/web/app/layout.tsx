import type { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { SessionProvider } from '@/components/providers/session-provider';
import { I18nProvider } from '@/i18n/context';
import './globals.css';

export const metadata: Metadata = {
  title: 'THS-THM System Manajemen',
  description: 'Sistem Manajemen THS-THM - Tunggal Hati Seminari & Tunggal Hati Maria',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'THS-THM',
  },
  icons: {
    icon: '/favicon.png',
    apple: '/apple-icon.png',
  },
};

// Next 14+: viewport & themeColor harus di export `viewport`, bukan di `metadata`.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1B2A4A',
};


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased overflow-x-hidden">
        <ThemeProvider>
          <ToastProvider>
            <SessionProvider>
              <I18nProvider>{children}</I18nProvider>
            </SessionProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
