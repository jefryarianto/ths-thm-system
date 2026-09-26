'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState, useEffect, useRef } from 'react';
import {
  Menu,
  X,
  Globe,
  ChevronRight,
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  Home,
  BookOpen,
  Landmark,
  Users,
  Building2,
  Newspaper,
  Image as ImageIcon,
  ShieldCheck,
  BadgeCheck,
  Heart,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useI18n } from '@/i18n/context';

interface PublicLayoutProps {
  children: ReactNode;
}

interface DropdownItem {
  href: string;
  label: string;
  desc?: string;
  icon: React.ElementType;
}

interface NavDropdown {
  id: string;
  label: string;
  items: DropdownItem[];
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { locale, t, setLocale } = useI18n();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openMobileAccordions, setOpenMobileAccordions] = useState<Record<string, boolean>>({
    tentang: true,
    informasi: false,
    layanan: false,
  });
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close desktop dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  }, [pathname]);

  const toggleMobileAccordion = (key: string) => {
    setOpenMobileAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const DROPDOWNS: NavDropdown[] = [
    {
      id: 'tentang',
      label: t.nav.tentang || 'Tentang Kami',
      items: [
        {
          href: '/sejarah',
          label: t.nav.sejarah || 'Sejarah',
          desc: 'Kilas balik berdirinya THS-THM & para pendiri',
          icon: BookOpen,
        },
        {
          href: '/organisasi',
          label: t.nav.organisasi || 'Visi & AD/ART',
          desc: 'Prinsip organisasi, visi, misi, dan landasan iman',
          icon: Landmark,
        },
        {
          href: '/struktur-organisasi',
          label: t.nav.strukturOrganisasi || 'Struktur Organisasi',
          desc: 'Bagan tata kelola tingkat Nasional hingga Unit',
          icon: Building2,
        },
        {
          href: '/kepengurusan',
          label: t.nav.kepengurusan || 'Kepengurusan',
          desc: 'Jajaran dewan kepengurusan & koordinator distrik',
          icon: Users,
        },
      ],
    },
    {
      id: 'informasi',
      label: t.nav.informasi || 'Informasi',
      items: [
        {
          href: '/berita',
          label: t.nav.berita || 'Warta & Berita',
          desc: 'Kabar kegiatan terkini, pengumuman, dan artikel',
          icon: Newspaper,
        },
        {
          href: '/galeri',
          label: t.nav.galeri || 'Galeri Foto & Video',
          desc: 'Dokumentasi momen latihan dan acara bersama',
          icon: ImageIcon,
        },
      ],
    },
    {
      id: 'layanan',
      label: t.nav.layanan || 'Layanan Publik',
      items: [
        {
          href: '/verify',
          label: t.nav.verifikasi || 'Verifikasi Dokumen / KTA',
          desc: 'Cek keabsahan sertifikat, ijazah, atau kartu anggota via QR',
          icon: ShieldCheck,
        },
        {
          href: '/klaim',
          label: t.nav.klaim || 'Klaim Akun Anggota',
          desc: 'Aktivasi akun digital untuk anggota yang sudah terdaftar',
          icon: BadgeCheck,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ── Top Utility Bar ── */}
      <div className="bg-navy-950 text-white/80 text-xs border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-8">
          <div className="flex items-center gap-4">
            <a
              href="tel:+628123456789"
              className="hidden sm:flex items-center gap-1 hover:text-gold-400 transition-colors"
              title="Hubungi Kontak THS-THM"
            >
              <Phone size={11} aria-hidden="true" className="shrink-0 text-gold-400" />
              <span>THS-THM Hotline</span>
            </a>
            <a
              href="mailto:info@ths-thm.cloud"
              className="hidden md:flex items-center gap-1 hover:text-gold-400 transition-colors"
              title="Kirim Email"
            >
              <Mail size={11} aria-hidden="true" className="shrink-0 text-gold-400" />
              <span>info@ths-thm.cloud</span>
            </a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
              className="flex items-center gap-1 hover:text-gold-400 transition-colors"
              aria-label={locale === 'id' ? 'Ganti bahasa ke Inggris' : 'Ganti bahasa ke Bahasa Indonesia'}
            >
              <Globe size={12} aria-hidden="true" className="text-gold-400" />
              <span className="font-medium">{locale === 'id' ? 'EN' : 'ID'}</span>
            </button>
            <Link href="/login" className="hover:text-gold-400 transition-colors">
              {t.nav.login}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main Navbar (Navy Gelap Resmi THS-THM) ── */}
      <nav
        aria-label="Navigasi utama"
        className={`bg-navy-900 border-b border-gold-400/20 sticky top-0 z-50 transition-all duration-300 text-white ${
          scrolled ? 'shadow-xl bg-navy-950/95 backdrop-blur-md' : 'shadow-lg'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-white p-1 shadow-md shrink-0 flex items-center justify-center border border-white/20">
                <img src="/logo.svg" alt="THS-THM Logo" className="w-full h-full object-contain" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold font-serif text-white text-lg leading-tight block tracking-tight">
                  THS-THM
                </span>
                <span className="text-[10px] text-gold-300/90 leading-tight font-medium">
                  Tunggal Hati Seminari &mdash; Tunggal Hati Maria
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex lg:items-center lg:gap-1">
              {/* Home */}
              <Link
                href="/"
                className={`px-3 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  pathname === '/'
                    ? 'bg-gold-400 text-navy-950 font-bold shadow-md'
                    : 'text-white/85 hover:text-gold-300 hover:bg-white/10'
                }`}
              >
                {t.nav.beranda || 'Beranda'}
              </Link>

              {/* Dropdowns */}
              {DROPDOWNS.map((group) => {
                const isGroupActive = group.items.some((item) => pathname === item.href);
                const isOpen = openDropdown === group.id;

                return (
                  <div key={group.id} className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(isOpen ? null : group.id)}
                      onMouseEnter={() => setOpenDropdown(group.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                        isGroupActive
                          ? 'bg-white/15 text-gold-300 font-bold'
                          : 'text-white/85 hover:text-gold-300 hover:bg-white/10'
                      }`}
                      aria-expanded={isOpen}
                      aria-haspopup="true"
                    >
                      <span>{group.label}</span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-gold-400' : ''}`}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {isOpen && (
                      <div
                        onMouseLeave={() => setOpenDropdown(null)}
                        className="absolute left-0 top-full pt-2 w-72 z-50 animate-slide-down"
                      >
                        <div className="bg-navy-950/95 backdrop-blur-xl border border-gold-400/30 rounded-2xl p-2 shadow-2xl space-y-1">
                          {group.items.map((item) => {
                            const isItemActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpenDropdown(null)}
                                className={`flex items-start gap-3 p-2.5 rounded-xl transition-all duration-150 group ${
                                  isItemActive
                                    ? 'bg-gold-400 text-navy-950'
                                    : 'text-white/90 hover:bg-white/10 hover:text-gold-300'
                                }`}
                              >
                                <div
                                  className={`p-2 rounded-lg shrink-0 ${
                                    isItemActive
                                      ? 'bg-navy-950 text-gold-400'
                                      : 'bg-white/10 text-gold-400 group-hover:bg-gold-400 group-hover:text-navy-950'
                                  }`}
                                >
                                  <Icon size={16} />
                                </div>
                                <div className="min-w-0">
                                  <div
                                    className={`text-sm font-semibold leading-snug ${
                                      isItemActive ? 'text-navy-950 font-bold' : 'text-white'
                                    }`}
                                  >
                                    {item.label}
                                  </div>
                                  {item.desc && (
                                    <div
                                      className={`text-2xs leading-tight line-clamp-1 mt-0.5 ${
                                        isItemActive ? 'text-navy-900/80' : 'text-white/60'
                                      }`}
                                    >
                                      {item.desc}
                                    </div>
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Donasi Link */}
              <Link
                href="/donasi"
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  pathname === '/donasi'
                    ? 'bg-gold-400 text-navy-950 font-bold shadow-md'
                    : 'text-white/85 hover:text-gold-300 hover:bg-white/10'
                }`}
              >
                <Heart size={14} className="text-gold-400" />
                <span>{t.nav.donasi || 'Donasi'}</span>
              </Link>
            </div>

            {/* Right side: Search + CTA */}
            <div className="flex items-center gap-3">
              <Link
                href="/daftar"
                className="hidden sm:inline-flex items-center gap-2 bg-gold-400 text-navy-950 px-5 py-2 rounded-xl text-sm font-bold hover:bg-gold-300 shadow-md transition-all duration-200"
              >
                {t.nav.daftar}
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors duration-200"
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
          <div className="lg:hidden border-t border-white/10 bg-navy-950/98 backdrop-blur-xl text-white animate-slide-down shadow-2xl max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-2">
              {/* Beranda */}
              <Link
                href="/"
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-semibold transition-colors ${
                  pathname === '/' ? 'bg-gold-400 text-navy-950 font-bold' : 'text-white hover:bg-white/10'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home size={18} />
                <span>{t.nav.beranda || 'Beranda'}</span>
              </Link>

              {/* Accordion Groups */}
              {DROPDOWNS.map((group) => {
                const isOpen = openMobileAccordions[group.id] ?? false;
                const isGroupActive = group.items.some((item) => pathname === item.href);

                return (
                  <div key={group.id} className="rounded-xl border border-white/10 overflow-hidden bg-white/5">
                    <button
                      type="button"
                      onClick={() => toggleMobileAccordion(group.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-white/90 hover:text-white"
                      aria-expanded={isOpen}
                    >
                      <span className={isGroupActive ? 'text-gold-300 font-bold' : ''}>{group.label}</span>
                      <ChevronDown
                        size={16}
                        className={`text-gold-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-2 pb-2 space-y-1">
                        {group.items.map((item) => {
                          const isItemActive = pathname === item.href;
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                                isItemActive
                                  ? 'bg-gold-400 text-navy-950 font-bold'
                                  : 'text-white/80 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              <Icon size={16} className={isItemActive ? 'text-navy-950' : 'text-gold-400'} />
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Donasi */}
              <Link
                href="/donasi"
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-semibold transition-colors ${
                  pathname === '/donasi' ? 'bg-gold-400 text-navy-950 font-bold' : 'text-white hover:bg-white/10'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Heart size={18} className="text-gold-400" />
                <span>{t.nav.donasi || 'Donasi'}</span>
              </Link>

              {/* Login & Daftar Actions */}
              <div className="pt-3 mt-3 border-t border-white/10 space-y-2">
                <Link
                  href="/login"
                  className="block px-4 py-3 text-white hover:bg-white/10 rounded-xl font-semibold transition-colors text-center border border-white/20"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.nav.login}
                </Link>
                <Link
                  href="/daftar"
                  className="block px-4 py-3 bg-gold-400 text-navy-950 rounded-xl hover:bg-gold-300 font-bold transition-colors text-center shadow-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.nav.daftar}
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main id="main-content" className="flex-1">
        {children}
      </main>

      {/* ── Footer ── */}
      <footer className="bg-navy-900 text-white">
        {/* Main Footer */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Column 1: About */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.svg" alt="THS-THM Logo" className="w-10 h-10 rounded-lg object-contain bg-white p-1" />
                <div>
                  <span className="font-bold text-white text-lg leading-tight block font-serif">THS-THM</span>
                  <span className="text-[10px] text-white/60 leading-tight">
                    Tunggal Hati Seminari &mdash; Tunggal Hati Maria
                  </span>
                </div>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                Sistem Manajemen Organisasi THS-THM &mdash; Kelola anggota, iuran, latihan, pendadaran, dan dokumentasi secara digital.
              </p>
            </div>

            {/* Column 2: Profil & Navigasi */}
            <div>
              <h4 className="font-bold text-gold-400 mb-4 text-xs uppercase tracking-widest">Tentang Organisasi</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/sejarah" className="text-white/70 hover:text-white transition-colors text-sm flex items-center gap-1.5">
                    <ChevronRight size={12} className="text-gold-400" aria-hidden="true" />
                    <span>Sejarah Pendirian</span>
                  </Link>
                </li>
                <li>
                  <Link href="/organisasi" className="text-white/70 hover:text-white transition-colors text-sm flex items-center gap-1.5">
                    <ChevronRight size={12} className="text-gold-400" aria-hidden="true" />
                    <span>Visi & AD/ART</span>
                  </Link>
                </li>
                <li>
                  <Link href="/struktur-organisasi" className="text-white/70 hover:text-white transition-colors text-sm flex items-center gap-1.5">
                    <ChevronRight size={12} className="text-gold-400" aria-hidden="true" />
                    <span>Struktur Organisasi</span>
                  </Link>
                </li>
                <li>
                  <Link href="/kepengurusan" className="text-white/70 hover:text-white transition-colors text-sm flex items-center gap-1.5">
                    <ChevronRight size={12} className="text-gold-400" aria-hidden="true" />
                    <span>Dewan Kepengurusan</span>
                  </Link>
                </li>
                <li>
                  <Link href="/berita" className="text-white/70 hover:text-white transition-colors text-sm flex items-center gap-1.5">
                    <ChevronRight size={12} className="text-gold-400" aria-hidden="true" />
                    <span>Warta & Berita</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Akses Cepat */}
            <div>
              <h4 className="font-bold text-gold-400 mb-4 text-xs uppercase tracking-widest">Akses Cepat</h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/login"
                    className="text-white/60 hover:text-white transition-colors text-sm flex items-center gap-1"
                  >
                    <ChevronRight size={12} aria-hidden="true" />
                    {t.nav.login}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/daftar"
                    className="text-white/60 hover:text-white transition-colors text-sm flex items-center gap-1"
                  >
                    <ChevronRight size={12} aria-hidden="true" />
                    {t.nav.daftar}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sejarah"
                    className="text-white/60 hover:text-white transition-colors text-sm flex items-center gap-1"
                  >
                    <ChevronRight size={12} aria-hidden="true" />
                    {t.nav.sejarah}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Kontak */}
            <div>
              <h4 className="font-bold text-gold-400 mb-4 text-xs uppercase tracking-widest">Kontak</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-sm text-white/70">
                  <MapPin size={14} className="shrink-0 mt-0.5 text-gold-400" aria-hidden="true" />
                  <span>Indonesia</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-white/70">
                  <Mail size={14} className="shrink-0 mt-0.5 text-gold-400" aria-hidden="true" />
                  <a href="mailto:info@ths-thm.cloud" className="hover:text-gold-400 transition-colors">
                    info@ths-thm.cloud
                  </a>
                </li>
                <li className="flex items-start gap-2 text-sm text-white/70">
                  <Phone size={14} className="shrink-0 mt-0.5 text-gold-400" aria-hidden="true" />
                  <a href="tel:+628123456789" className="hover:text-gold-400 transition-colors">
                    +62 812-3456-789 (Sekretariat)
                  </a>
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
            <p className="text-white/30 text-xs">Dikelola oleh Tim Teknologi THS-THM</p>
          </div>
        </div>
      </footer>
    </div>
  );
}