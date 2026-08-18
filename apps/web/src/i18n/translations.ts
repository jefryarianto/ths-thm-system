export const translations = {
  id: {
    // Navigation
    nav: {
      sejarah: 'Sejarah',
      organisasi: 'Organisasi',
      kepengurusan: 'Kepengurusan',
      berita: 'Berita',
      galeri: 'Galeri',
      donasi: 'Donasi',
      login: 'Login',
      daftar: 'Daftar',
    },
    // Home
    home: {
      hero: 'Selamat Datang di THS-THM',
      subtitle: 'Tunggal Hati Seminari - Tunggal Hati Maria',
      description: 'Organisasi Pencaak Silat Pendidikan',
    },
    // Sejarah
    sejarah: {
      title: 'Sejarah THS-THM',
      empty: 'Konten belum tersedia',
    },
    // Organisasi
    organisasi: {
      title: 'Struktur Organisasi',
      empty: 'Data struktur organisasi belum tersedia',
    },
    // Kepengurusan
    kepengurusan: {
      title: 'Kepengurusan',
      distrik: 'Distrik',
      wilayah: 'Wilayah',
      ranting: 'Ranting',
      anggota: 'anggota',
      failed: 'Gagal memuat data kepengurusan',
    },
    // Berita
    berita: {
      title: 'Berita & Artikel',
      readMore: 'Baca selengkapnya',
      empty: 'Belum ada berita',
    },
    // Galeri
    galeri: {
      title: 'Galeri',
      empty: 'Belum ada foto',
      emptyDesc: 'Galeri akan segera diisi dengan momen-momen indah THS-THM',
    },
    // Donasi
    donasi: {
      title: 'Donasi',
      subtitle: 'Dukung kegiatan THS-THM dengan donasi Anda. Setiap kontribusi, besar maupun kecil, sangat berarti untuk kelangsungan program-program kami.',
      rekeningTitle: 'Rekening Donasi',
      programTitle: 'Program Donasi Saat Ini',
      terkumpul: 'Terkumpul',
      target: 'Target',
      donasiSekarang: 'Donasi Sekarang',
      qrisTitle: 'Donasi QRIS',
      qrisDesc: 'Scan kode QRIS di bawah untuk donasi cepat via e-wallet',
      emptyRekening: 'Informasi rekening belum tersedia',
      emptyProgram: 'Belum ada program donasi aktif',
    },
    // Common
    common: {
      loading: 'Memuat...',
      error: 'Gagal memuat data',
      retry: 'Coba Lagi',
      back: 'Kembali',
    },
  },
  en: {
    // Navigation
    nav: {
      sejarah: 'History',
      organisasi: 'Organization',
      kepengurusan: 'Management',
      berita: 'News',
      galeri: 'Gallery',
      donasi: 'Donation',
      login: 'Login',
      daftar: 'Register',
    },
    // Home
    home: {
      hero: 'Welcome to THS-THM',
      subtitle: 'Tunggal Hati Seminari - Tunggal Hati Maria',
      description: 'Martial Arts Education Organization',
    },
    // Sejarah
    sejarah: {
      title: 'THS-THM History',
      empty: 'Content not yet available',
    },
    // Organisasi
    organisasi: {
      title: 'Organizational Structure',
      empty: 'Organizational structure data not yet available',
    },
    // Kepengurusan
    kepengurusan: {
      title: 'Management',
      distrik: 'District',
      wilayah: 'Region',
      ranting: 'Branch',
      anggota: 'members',
      failed: 'Failed to load management data',
    },
    // Berita
    berita: {
      title: 'News & Articles',
      readMore: 'Read more',
      empty: 'No news yet',
    },
    // Galeri
    galeri: {
      title: 'Gallery',
      empty: 'No photos yet',
      emptyDesc: 'Gallery will soon be filled with beautiful moments from THS-THM',
    },
    // Donasi
    donasi: {
      title: 'Donation',
      subtitle: 'Support THS-THM activities with your donation. Every contribution, big or small, is very meaningful for the continuity of our programs.',
      rekeningTitle: 'Donation Accounts',
      programTitle: 'Current Donation Programs',
      terkumpul: 'Raised',
      target: 'Target',
      donasiSekarang: 'Donate Now',
      qrisTitle: 'QRIS Donation',
      qrisDesc: 'Scan the QRIS code below for quick donation via e-wallet',
      emptyRekening: 'Account information not yet available',
      emptyProgram: 'No active donation programs',
    },
    // Common
    common: {
      loading: 'Loading...',
      error: 'Failed to load data',
      retry: 'Try Again',
      back: 'Back',
    },
  },
} as const;

export type Locale = 'id' | 'en';
export type TranslationKeys = (typeof translations)[Locale];
