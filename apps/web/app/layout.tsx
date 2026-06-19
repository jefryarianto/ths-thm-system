import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'THS-THM System Manajemen',
  description: 'Sistem Manajemen THS-THM (Taman Harapan Siswa / Taman Harapan Murid)',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
