'use client';

import Link from 'next/link';
import { ReactNode, useState } from 'react';
import { Menu, X, Globe } from 'lucide-react';
import { useI18n } from '@/i18n/context';

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { locale, t, setLocale } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NAV_LINKS = [
    { href: '/sejarah', label: t.nav.sejarah },
    { href: '/organisasi', label: t.nav.organisasi },
    { href: '/kepengurusan', label: t.nav.kepengurusan },
    { href: '/berita', label: t.nav.berita },
    { href: '/galeri', label: t.nav.galeri },
    { href: '/donasi', label: t.nav.donasi },
  ];

  return (
    <div className='min-h-screen bg-gradient-to-b from-blue-50 to-white'>
      <nav className='bg-white shadow-sm border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between h-16 items-center'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-full bg-yellow-400 border-2 border-blue-900 flex items-center justify-center font-bold text-blue-900 text-sm'>
                THS
              </div>
              <span className='font-bold text-blue-900 text-lg'>THS-THM</span>
            </div>

            {/* Desktop Navigation */}
            <div className='hidden md:flex md:items-center md:gap-6'>
              <div className='flex items-center gap-4'>
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className='text-blue-900 hover:text-blue-700 font-medium transition-colors'
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className='flex items-center gap-4 ml-8 border-l border-gray-200 pl-8'>
                <button
                  onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
                  className='flex items-center gap-1 px-2 py-1 text-sm text-blue-900 hover:bg-blue-50 rounded-lg transition-colors'
                >
                  <Globe size={16} />
                  <span className='font-medium'>{locale === 'id' ? 'EN' : 'ID'}</span>
                </button>
                <Link href='/login' className='text-blue-900 hover:text-blue-700 font-medium'>
                  {t.nav.login}
                </Link>
                <Link href='/daftar' className='bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-medium'>
                  {t.nav.daftar}
                </Link>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className='flex items-center gap-2 md:hidden'>
              <button
                onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
                className='p-2 rounded-lg text-blue-900 hover:bg-blue-50 transition-colors'
              >
                <Globe size={20} />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className='p-2 rounded-lg text-blue-900 hover:bg-blue-50 transition-colors'
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div className='md:hidden py-4 border-t border-gray-100 animate-slide-down'>
              <div className='flex flex-col gap-2'>
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className='px-4 py-3 text-blue-900 hover:bg-blue-50 rounded-lg font-medium transition-colors'
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className='pt-2 border-t border-gray-100 flex flex-col gap-2'>
                  <Link
                    href='/login'
                    className='px-4 py-3 text-blue-900 hover:bg-blue-50 rounded-lg font-medium transition-colors'
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t.nav.login}
                  </Link>
                  <Link
                    href='/daftar'
                    className='px-4 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 font-medium transition-colors text-center'
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t.nav.daftar}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main>{children}</main>

      <footer className='bg-gray-900 text-gray-400 py-12'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='grid grid-cols-2 md:grid-cols-6 gap-6 mb-8'>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className='text-gray-300 hover:text-white transition-colors text-center'
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className='border-t border-gray-800 pt-8 text-center'>
            <p>&copy; {new Date().getFullYear()} THS-THM. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
