'use client';

import Link from 'next/link';
import { ReactNode, useState, useEffect } from 'react';
import { Menu, X, Globe, ChevronRight, Phone, Mail, MapPin } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useI18n } from '@/i18n/context';

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { locale, t, setLocale } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const NAV_LINKS = [
    { href: '/sejarah', label: t.nav.sejarah },
    { href: '/organisasi', label: t.nav.organisasi },
    { href: '/kepengurusan', label: t.nav.kepengurusan },
    { href: '/struktur-organisasi', label: t.nav.strukturOrganisasi || 'Struktur Organisasi' },
    { href: '/berita', label: t.nav.berita },
    { href: '/galeri', label: t.nav.galeri },
    { href: '/donasi', label: t.nav.donasi },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top Utility Bar ── */}
      <div className="bg-navy-900 text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-8">
          <div className="flex items-center gap-4">
            <span className="hidden sm:flex items-center gap-1">
              <Phone size={11} />
              <span>THS-THM</span>
            </span>
            <span className="hidden md:flex items-center gap-1">
              <Mail size={11} />
              <span>info@ths-thm.cloud</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
              <button
              onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
              className="flex items-center gap-1 hover:text-accent-400 transition-colors"
            >
              <Globe size={12} />
              <span className="font-medium">{locale === 'id' ? 'EN' : 'ID'}</span>
            </button>
            <Link href="/login" className="hover:text-accent-400 transition-colors">
              {t.nav.login}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main Navbar ── */}
      <nav
        className={`bg-white sticky top-0 z-50 transition-shadow duration-300 ${
          scrolled ? 'shadow-lg' : 'shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <img src="/logo.svg" alt="THS-THM Logo" className="w-10 h-10 rounded-lg object-contain shadow-md" />
              <div className="hidden sm:block">
                <span className="font-bold font-serif font-bold text-navy-800 text-lg leading-tight block tracking-tight">
                  THS-THM
                </span>
                <span className="text-[10px] text-navy-400 leading-tight font-medium">
                  Tunggal Hati Seminari &mdash; Tunggal Hati Maria
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex lg:items-center lg:gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3.5 py-2 text-sm font-medium text-navy-600 hover:text-navy-900 hover:bg-navy-50 rounded-xl transition-all duration-200 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right side: Search + CTA */}
            <div className="flex items-center gap-3">
              <Link
                href="/daftar"
                className="hidden sm:inline-flex items-center gap-2 bg-gold-400 text-navy-900 px-5 py-2 rounded-xl text-sm font-bold hover:bg-gold-300 shadow-elegant transition-all duration-200 transition-colors shadow-sm"
              >
                {t.nav.daftar}
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-navy-600 hover:bg-navy-50 transition-colors duration-200"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile Navigation Drawer ── */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white animate-slide-down">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-4 py-3 text-navy-700 hover:bg-navy-50 hover:text-navy-900 rounded-xl font-medium transition-colors duration-200 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 mt-3 border-t border-gray-100 space-y-2">
                <Link
                  href="/login"
                  className="block px-4 py-3 text-primary-700 hover:bg-primary-50 rounded-lg font-semibold transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.nav.login}
                </Link>
                <Link
                  href="/daftar"
                  className="block px-4 py-3 bg-gold-400 text-navy-900 rounded-xl hover:bg-gold-300 font-bold transition-colors text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.nav.daftar}
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main>{children}</main>

      {/* ── Footer ── */}
      <footer className="bg-navy-900 text-white">
        {/* Main Footer */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Column 1: About */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.svg" alt="THS-THM Logo" className="w-10 h-10 rounded-lg object-contain" />
                <div>
                  <span className="font-bold text-white text-lg leading-tight block">
                    THS-THM
                  </span>
                  <span className="text-[10px] text-white/60 leading-tight">
                    Tunggal Hati Seminari &mdash; Tunggal Hati Maria
                  </span>
                </div>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                Sistem Manajemen Organisasi THS-THM - Kelola anggota, iuran, latihan, pendadaran, dan dokumentasi secara digital.
              </p>
            </div>

            {/* Column 2: Navigasi */}
            <div>
              <h4 className="font-bold text-gold-400 mb-4 text-xs uppercase tracking-widest">
                Navigasi
              </h4>
              <ul className="space-y-2">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-white/60 hover:text-white transition-colors text-sm flex items-center gap-1"
                    >
                      <ChevronRight size={12} />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Akses Cepat */}
            <div>
              <h4 className="font-bold text-gold-400 mb-4 text-xs uppercase tracking-widest">
                Akses Cepat
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/login" className="text-white/60 hover:text-white transition-colors text-sm flex items-center gap-1">
                    <ChevronRight size={12} />
                    {t.nav.login}
                  </Link>
                </li>
                <li>
                  <Link href="/daftar" className="text-white/60 hover:text-white transition-colors text-sm flex items-center gap-1">
                    <ChevronRight size={12} />
                    {t.nav.daftar}
                  </Link>
                </li>
                <li>
                  <Link href="/sejarah" className="text-white/60 hover:text-white transition-colors text-sm flex items-center gap-1">
                    <ChevronRight size={12} />
                    {t.nav.sejarah}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Kontak */}
            <div>
              <h4 className="font-bold text-gold-400 mb-4 text-xs uppercase tracking-widest">
                Kontak
              </h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-sm text-white/70">
                  <MapPin size={14} className="shrink-0 mt-0.5 text-gold-400/40" />
                  <span>Indonesia</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-white/70">
                  <Mail size={14} className="shrink-0 mt-0.5 text-gold-400/40" />
                  <span>info@ths-thm.cloud</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-white/70">
                  <Phone size={14} className="shrink-0 mt-0.5 text-gold-400/40" />
                  <span>THS-THM</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-white/50 text-xs">
              &copy; {new Date().getFullYear()} THS-THM. All rights reserved.
            </p>
            <p className="text-white/30 text-xs">
              Dikelola oleh Tim Teknologi THS-THM
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
