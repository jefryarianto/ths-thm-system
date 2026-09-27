export interface TimelineEvent {
  year: string;
  date: string;
  badge: string;
  title: string;
  location?: string;
  description: string;
  highlights: string[];
}

export interface SymbolItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  colorType: 'gold' | 'red' | 'blue' | 'emerald' | 'navy' | 'amber';
}

export const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    year: '1983',
    date: 'Awal Tahun 1983',
    badge: 'Benih Perintisan',
    title: 'Prakarsa di Seminari Mertoyudan',
    location: 'Seminari Menengah St. Petrus Canisius, Mertoyudan',
    description:
      'Rm. Martinus Hadiwijoyo, Pr. bersama para frater dan seminaris mulai merintis latihan pencak silat yang dipadukan dengan olah batin dan spiritualitas Katolik sebagai sarana melatih kedisiplinan raga dan ketahanan mental para calon imam.',
    highlights: [
      'Diprakarsai oleh Rm. Martinus Hadiwijoyo, Pr.',
      'Latihan rutin bagi para siswa Seminari Menengah',
      'Penyelarasan jurus pencak silat dengan doa & olah rohani',
    ],
  },
  {
    year: '1984–1985',
    date: '1984 – Pertengahan 1985',
    badge: 'Gerakan Kaum Muda',
    title: 'Pengembangan di Paroki Tanjung Priok',
    location: 'Paroki St. Fransiskus Xaverius, Tanjung Priok, Jakarta Utara',
    description:
      'Latihan bela diri rohani diperluas ke kalangan Orang Muda Katolik (Mudika). Antusiasme generasi muda membuktikan kebutuhan wadah pembinaan karakter positif yang tangguh dan berakar pada nilai-nilai Kristiani.',
    highlights: [
      'Keterlibatan aktif generasi muda paroki',
      'Penyusunan kurikulum jurus dasar & etika pesilat Katolik',
      'Pembentukan ikatan persaudaraan erat lintas lingkungan',
    ],
  },
  {
    year: '1985',
    date: '10 November 1985',
    badge: 'Tonggak Bersejarah',
    title: 'Peresmian Tunggal Hati Seminari (THS)',
    location: 'Jakarta',
    description:
      'Tunggal Hati Seminari (THS) resmi berdiri bertepatan dengan peringatan Hari Pahlawan Nasional. Nama "Tunggal Hati" mencerminkan persatuan hati dengan Hati Kudus Yesus serta tekad membela nusa, bangsa, dan Gereja dengan sesanti "Pro Patria et Ecclesia".',
    highlights: [
      'Diresmikan bertepatan dengan Hari Pahlawan Nasional',
      'Pelindung Rohani: Hati Kudus Yesus',
      'Motto: Pro Patria et Ecclesia & Fortiter in Re, Suaviter in Modo',
    ],
  },
  {
    year: '1986',
    date: '10 November 1986',
    badge: 'Kelahiran Saudari',
    title: 'Peresmian Tunggal Hati Maria (THM)',
    location: 'Jakarta',
    description:
      'Tepat satu tahun setelah kelahiran THS, Tunggal Hati Maria (THM) didirikan pada 10 November 1986 sebagai wadah pembinaan rohani dan bela diri bagi kaum puteri di bawah naungan Hati Tak Bernoda Bunda Maria.',
    highlights: [
      'Wadah khusus bagi anggota puteri di bawah teladan Bunda Maria',
      'Pelindung Rohani: Hati Tak Bernoda Bunda Maria',
      'Menjunjung tinggi kelembutan budi, keteguhan hati, dan kesucian jiwa',
    ],
  },
  {
    year: '1987–2000',
    date: 'Dekade 1990-an',
    badge: 'Penyebaran Nasional',
    title: 'Ekspansi Antar-Keuskupan & Mancanegara',
    location: 'Seluruh Indonesia & Timor Leste',
    description:
      'THS-THM berkembang pesat ke berbagai distrik dan wilayah di seluruh Indonesia (Jawa, Sumatera, Kalimantan, Sulawesi, Nusa Tenggara, Papua) hingga Timor Leste dengan kepengurusan berjenjang yang solid.',
    highlights: [
      'Terbentuknya Distrik-Distrik di berbagai Provinsi & Keuskupan',
      'Penyelenggaraan Retret Pendadaran & Ujian Kenaikan Tingkat Nasional',
      'Partisipasi aktif dalam kegiatan liturgis dan kepemudaan Gereja',
    ],
  },
  {
    year: '2020–Kini',
    date: 'Era Modern & Digital',
    badge: 'Transformasi Berkelanjutan',
    title: 'Tata Kelola Modern & Digitalisasi Organisasi',
    location: 'Tingkat Nasional',
    description:
      'THS-THM melangkah ke era modern dengan tata kelola profesional dan terintegrasi melalui platform digital ths-thm.cloud untuk manajemen anggota, sertifikasi pendadaran, dan komunikasi nasional.',
    highlights: [
      'Peluncuran Sistem Digital Terpadu THS-THM',
      'Pembaruan standarisasi kurikulum jurus & tata tertib',
      'Kiprah ribuan pendekar Katolik di masyarakat dan Gereja',
    ],
  },
];
