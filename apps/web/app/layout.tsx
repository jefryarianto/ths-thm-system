import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { I18nProvider } from '@/i18n/context';
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


const Fonts = () => (
  <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  </>
);

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head><Fonts /></head>
      <body className="antialiased">
        <ThemeProvider>
          <ToastProvider>
            <I18nProvider>{children}</I18nProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
