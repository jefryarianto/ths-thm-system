'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-400 border-2 border-blue-900 flex items-center justify-center font-bold text-blue-900 text-sm">
                THS
              </div>
              <span className="font-bold text-blue-900 text-lg">THS-THM</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-blue-900 hover:text-blue-700 font-medium">
                Login
              </Link>
              <Link href="/daftar" className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-medium">
                Daftar
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>

      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} THS-THM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}