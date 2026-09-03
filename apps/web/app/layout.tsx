import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { SessionProvider } from '@/components/providers/session-provider';
import { I18nProvider } from '@/i18n/context';
import { ServiceWorkerRegistration } from '@/components/providers/sw-register';
import './globals.css';

export const metadata: Metadata = {
  title: 'THS-THM System Manajemen',
  description: 'Sistem Manajemen THS-THM - Tunggal Hati Seminari & Tunggal Hati Maria',
  manifest: '/manifest.json',
  themeColor: '#1B2A4A',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'THS-THM',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    icon: '/favicon.png',
    apple: '/apple-icon.png',
  },
};


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased">
        <ServiceWorkerRegistration />
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
