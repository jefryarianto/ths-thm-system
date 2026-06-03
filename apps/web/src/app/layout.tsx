import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'THS-THM System Manajemen',
  description: 'Sistem Manajemen THS-THM (Taman Harapan Siswa / Taman Harapan Murid)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactElement;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>{children as any}</ThemeProvider>
      </body>
    </html>
  );
}