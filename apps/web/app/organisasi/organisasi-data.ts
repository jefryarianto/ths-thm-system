export interface VisiMisiSection {
  visi: {
    title: string;
    statement: string;
    description: string;
    values: string[];
  };
  misi: Array<{
    id: number;
    title: string;
    subtitle: string;
    description: string;
    pillar: string;
  }>;
  tujuan: string[];
  tugasPokok: string[];
}

export interface JanjiPrasetyaItem {
  number: number;
  text: string;
  penjelasan: string;
  dasarIman: string;
}

export interface PilarPembinaanItem {
  id: string;
  title: string;
  latin: string;
  subtitle: string;
  description: string;
  poinKunci: string[];
  colorTheme: 'gold' | 'navy' | 'emerald' | 'crimson';
}

export interface StrukturHierarkiItem {
  level: string;
  title: string;
  wilayahCakupan: string;
  deskripsi: string;
  masaJabatan: string;
  bph: string[];
  komisi?: string[];
}

export interface DewanPendiriItem {
  no: number;
  nama: string;
  gelarRole: string;
  keterangan: string;
}

export interface KategoriUsiaItem {
  kategori: string;
  rentangUsia: string;
  fokusPembinaan: string;
  keterangan: string;
}

export const STATUTA_INFO = {
  nomorTap: 'TAP 02 / THS-THM / 2023',
  namaStatuta:
    'Statuta Organisasi Pencak Silat Pendidikan Tunggal Hati Seminari - Tunggal Hati Maria',
  sidangNasional: 'Sidang Nasional IX THS-THM, Bogor 18–20 Agustus 2023',
  guruBesar: 'Yesus Kristus (Satu-satunya Guru Besar)',
  pelindungThs: 'Hati Kudus Yesus',
  pelindungThm: 'Hati Tak Bernoda Bunda Maria',
  semboyan: 'Pro Patria et Ecclesia',
  semboyanArti: 'Untuk Tanah Air dan Gereja',
  motto: 'Fortiter in Re, Suaviter in Modo',
  mottoArti: 'Kokoh kuat dalam prinsip, luwes dan lembut cara mencapainya',
  pilarUtama: 'Sanctitas (Kesucian), Sanitas (Kesehatan Jasmani), Scientia (Pengetahuan)',
  kedudukanPusat: 'Ibukota Negara Republik Indonesia',
};

export const VISI_MISI_DATA: VisiMisiSection = {
  visi: {
    title: 'Visi Organisasi (Statuta Pasal 6)',
    statement:
      'Organisasi Pencak Silat Pendidikan Tunggal Hati Seminari - Tunggal Hati Maria bervisi mewujudkan kader-kader orang muda Katolik yang militan dalam berbangsa dan beriman.',
    description:
      'Membentuk pribadi umat Katolik yang handal, berkedalaman rohani, cerdas, pemberani sebagai murid Yesus, dan kudus, yang berperan aktif mewujudkan Kerajaan Allah di dunia sebagai warganegara yang baik dan berintegritas sejati.',
    values: [
      'Sanctitas (Kekudusan & Kedalaman Rohani)',
      'Sanitas (Kebugaran Raga & Ksatria Bela Diri)',
      'Scientia (Kecerdasan Budi & Pengetahuan)',
      'Kerendahan Hati (Humilitas Utama)',
      'Militansi Iman & Cinta Tanah Air (Pro Patria et Ecclesia)',
    ],
  },
  misi: [
    {
      id: 1,
      title: 'Kaderisasi Integral Kaum Muda (3S)',
      subtitle: 'Sanctitas, Sanitas, et Scientia',
      description:
        'Menyelenggarakan kaderisasi orang muda Katolik menjadi pribadi yang berkembang secara integral dalam hal sanctitas (kesucian), sanitas (kesehatan jasmani), dan scientia (pengetahuan) sehingga mampu mengungkapkan serta mewujudkan imannya dengan meneladani kehidupan Yesus Kristus dan Bunda Maria dalam keseharian.',
      pillar: 'Spiritualitas & Pembinaan Karakter',
    },
    {
      id: 2,
      title: 'Penghayatan Ideologi Kebangsaan',
      subtitle: 'Pancasila & UUD 1945',
      description:
        'Menyelenggarakan kaderisasi orang muda Katolik yang menghayati dan mengamalkan nilai-nilai Dasar Negara Pancasila dan Undang-Undang Dasar 1945 sebagai ideologi bangsa serta wadah persatuan seluruh elemen Nusantara.',
      pillar: 'Kebangsaan & Cinta Tanah Air',
    },
    {
      id: 3,
      title: 'Pelestarian Seni Bela Diri Pencak Silat',
      subtitle: 'Kekayaan Budaya & Olah Tubuh',
      description:
        'Menanamkan sumber-sumber nilai budaya luhur bangsa melalui pelestarian, pengembangan, dan penguasaan seni bela diri pencak silat khas THS-THM yang dilandasi disiplin rohani, etika kesatria, dan pantang menyerah.',
      pillar: 'Seni Olah Tubuh & Bela Diri',
    },
    {
      id: 4,
      title: 'Pengabdian Kerasulan Gereja & Masyarakat',
      subtitle: 'Garam & Terang Dunia',
      description:
        'Mendorong partisipasi nyata seluruh anggota dalam karya pastoral Gereja Katolik Roma dari tingkat paroki hingga nasional, serta membaktikan diri bagi pelayanan sesama umat manusia tanpa membeda-bedakan latar belakang.',
      pillar: 'Kerasulan Awam & Pelayanan Kasih',
    },
  ],
  tujuan: [
    'Membangun manusia seutuhnya yang beriman tangguh, berakhlak mulia, dan sehat jasmani-rohani.',
    'Membina persaudaraan sejati yang rukun, kompak, dan saling menopang dalam semangat cinta kasih Kristiani.',
    'Menghasilkan kader pemimpin Gereja dan bangsa yang berani membela kebenaran dan keadilan.',
    'Mempersembahkan seluruh karya dan keberadaan organisasi kepada Gereja Katolik Roma secara utuh.',
  ],
  tugasPokok: [
    'Mengusahakan agar THS-THM beserta nilai-nilainya menjadi sarana pembangunan manusia seutuhnya yang berketahanan jasmani dan rohani.',
    'Memantau, menampung, menyalurkan, dan memperjuangkan aspirasi seluruh jajaran anggota serta unit THS-THM.',
    'Merencanakan dan mengembangkan THS-THM untuk memajukan kehidupan sosial, ekonomi, budaya, pendidikan, dan teknologi.',
    'Menggali, melestarikan, dan memasyarakatkan seni bela diri Pencak Silat sebagai kekayaan budaya nasional dan sumbangan bagi dunia.',
  ],
};

export const JANJI_PRASETYA_DATA = {
  pengantar:
    'Dengan kemauan sendiri dan dengan itikad baik saya menyatakan bersedia menjadi anggota Organisasi Beladiri Tunggal Hati Seminari - Tunggal Hati Maria dengan segala tanggung jawabnya. Apabila saya melanggar ketentuan yang telah digariskan oleh organisasi, maka saya bersedia dikeluarkan dari organisasi. Maka saya berjanji:',
  butir: [
    {
      number: 1,
      text: 'Bersedia menjadi pribadi yang rendah hati.',
      penjelasan:
        'Kerendahan hati (humilitas) adalah fondasi utama yang membuka hati manusia untuk menerima dan patuh pada ajaran Allah. Kekuatan bela diri tidak untuk disombongkan, melainkan untuk melayani sesama.',
      dasarIman: '“Belajarlah pada-Ku, karena Aku lemah lembut dan rendah hati” (Mat 11:29)',
    },
    {
      number: 2,
      text: 'Berani menjaga, membela, dan mengembangkan nama baik organisasi.',
      penjelasan:
        'Setiap pesilat membawa citra luhur THS-THM dalam tutur kata, sikap, dan perbuatan, serta berkomitmen memperluas karya kerasulan organisasi dengan integritas moral yang tinggi.',
      dasarIman: 'Menjadi saksi Kristus yang berani dan bertanggung jawab di tengah masyarakat.',
    },
    {
      number: 3,
      text: 'Taat dan setia sampai mati bagi Gereja Katolik Roma.',
      penjelasan:
        'Keberadaan THS-THM seutuhnya dipersembahkan kepada Gereja Katolik Roma. Anggota berjanji senantiasa taat pada Magisterium, hierarki Gereja, dan menghidupi sakramen-sakramen kudus.',
      dasarIman:
        'Kesetiaan pada Tubuh Mistik Kristus dan persatuan dengan Bapa Suci serta para Uskup.',
    },
    {
      number: 4,
      text: 'Bersedia taat dan patuh kepada orangtua.',
      penjelasan:
        'Menghormati ayah dan ibu sebagai wakil Allah di dunia, membahagiakan keluarga, serta menunjukkan bakti seorang anak yang berbudi luhur dalam keseharian hidup.',
      dasarIman:
        'Hukum Taurat ke-4: “Hormatilah ayahmu dan ibumu, supaya lanjut umurmu” (Kel 20:12)',
    },
    {
      number: 5,
      text: 'Menghayati dan mengamalkan Pancasila dan Undang-Undang Dasar 1945.',
      penjelasan:
        'Sebagai warga negara Indonesia yang setia 100% Katolik dan 100% Indonesia, anggota THS-THM mengamalkan nilai-nilai Pancasila serta menjaga keutuhan Negara Kesatuan Republik Indonesia (NKRI).',
      dasarIman:
        'Sesanti Pro Patria et Ecclesia — pengabdian seimbang bagi nusa, bangsa, dan Gereja.',
    },
  ],
  penutup: 'Semoga Tuhan Yesus dan Bunda Maria berkenan memberkati Janji Prasetya saya ini. Amin.',
  catatanStatuta:
    'Sesuai Pasal 14 ayat (2) Statuta 2023, Janji Prasetya ini wajib dikumandangkan oleh seluruh anggota pada setiap kegiatan latihan, apel, pelantikan, maupun upacara resmi THS-THM.',
};

export const TIGA_PILAR_DATA: PilarPembinaanItem[] = [
  {
    id: 'spiritualitas',
    title: 'Spiritualitas Katolik & Sanctitas',
    latin: 'Sanctitas — Kekudusan Hidup',
    subtitle: 'Landasan Utama Pengabdian & Doa',
    description:
      'Seluruh nafas organisasi berpusat pada Kasih Yesus Kristus dan teladan Bunda Maria. Pembinaan rohani dilakukan melalui perayaan Ekaristi, doa rutin, retret pendadaran, rekoleksi, devosi Rosario, dan pemahaman Kitab Suci.',
    poinKunci: [
      'Devosi Hati Kudus Yesus & Hati Tak Bernoda Maria',
      'Tradisi Doa Rosario dan Adorasi Sakramen Mahakudus',
      'Retret Pendadaran sebagai kawah candradimuka rohani',
      'Yesus Kristus sebagai satu-satunya Guru Besar abadi',
    ],
    colorTheme: 'crimson',
  },
  {
    id: 'beladiri',
    title: 'Pencak Silat & Sanitas',
    latin: 'Sanitas — Kebugaran & Olah Tubuh',
    subtitle: 'Seni Bela Diri Khas Warisan Budaya',
    description:
      'Latihan fisik dan jurus pencak silat khas THS-THM melatih ketangkasan raga, refleks bela diri, olah pernapasan, serta ketahanan mental. Mengedepankan prinsip bela diri defensif untuk melindungi yang lemah tanpa kesombongan.',
    poinKunci: [
      'Penguasaan jurus dasar, jurus kombinasi, dan senjata tradisional',
      'Olah napas pembinaan stamina dan konsentrasi',
      'Disiplin waktu, ketahanan jasmani, dan sportivitas tinggi',
      'Bela diri sebagai sarana pembentukan etika kesatria',
    ],
    colorTheme: 'navy',
  },
  {
    id: 'organisasi',
    title: 'Organisasi & Persaudaraan Sejati',
    latin: 'Scientia & Fraternitas — Kepemimpinan & Paseduluran',
    subtitle: 'Manajemen Tertib & Solidaritas Kasih',
    description:
      'Struktur organisasi berjenjang dari Nasional hingga Unit Latihan membentuk jiwa kepemimpinan, kepatuhan hierarki, administrasi modern, serta tali persaudaraan erat yang menembus sekat suku, bahasa, dan wilayah.',
    poinKunci: [
      'Kepemimpinan kolektif-kolegial di bawah bimbingan Hierarki Gereja',
      'Masa bakti teratur dan tertib administrasi nasional',
      'Hubungan persaudaraan Satu Hati di seluruh pelosok negeri',
      'Pelayanan sosial kemasyarakatan dan keterlibatan aktif di paroki',
    ],
    colorTheme: 'gold',
  },
];

export const STRUKTUR_HIERARKI_DATA: StrukturHierarkiItem[] = [
  {
    level: 'Nasional',
    title: 'Koordinatorat Nasional (KORNAS)',
    wilayahCakupan: 'Tingkat Nasional / Seluruh Indonesia & Luar Negeri',
    deskripsi:
      'Pengurus tertinggi pelaksana amanat Sidang Nasional/Retret Agung Nasional yang berkedudukan di Ibukota Negara. Mengatur standarisasi kurikulum, kebijakan strategis, hubungan gerejawi KWI, dan hubungan internasional.',
    masaJabatan: '3 Tahun per Periode',
    bph: ['Koordinator Nasional', 'Wakil Koordinator Nasional', 'Sekretaris & Wakil', 'Bendahara'],
    komisi: [
      'Komisi Pembinaan Mental-Spiritual (Mensprit)',
      'Komisi Penelitian & Pengembangan (Litbang)',
      'Komisi Kepelatihan & Kurikulum',
      'Komisi Hubungan Masyarakat (Humas)',
      'Komisi Ekonomi & Kewirausahaan',
      'Komisi Pengabdian Gereja & Masyarakat',
      'Komisi Keorganisasian & Hukum',
      'Komisi Luar Negeri & Hubungan Antar-Lembaga',
    ],
  },
  {
    level: 'Distrik',
    title: 'Koordinatorat Distrik (KORDIS)',
    wilayahCakupan: 'Tingkat Keuskupan',
    deskripsi:
      'Pengurus di tingkat Keuskupan yang mengoordinasikan seluruh paroki/ranting dalam satu wilayah yurisdiksi gerejani keuskupan setempat, bekerja sama erat dengan Uskup dan Komisi Kepemudaan Keuskupan.',
    masaJabatan: '3 Tahun per Periode',
    bph: ['Koordinator Distrik', 'Wakil Koordinator Distrik', 'Sekretaris', 'Bendahara'],
    komisi: [
      'Ketua Komisi Mensprit Distrik',
      'Ketua Komisi Litbang Distrik',
      'Ketua Komisi Kepelatihan Distrik',
      'Ketua Komisi Humas Distrik',
      'Ketua Komisi Ekonomi Distrik',
      'Ketua Komisi Pengabdian Masyarakat Distrik',
      'Ketua Komisi Keorganisasian Distrik',
    ],
  },
  {
    level: 'Wilayah',
    title: 'Koordinatorat Wilayah (KORWIL)',
    wilayahCakupan: 'Tingkat Kevikepan / Dekenat / Regio Keuskupan',
    deskripsi:
      'Struktur koordinatif penghubung antara Distrik dan Ranting pada wilayah keuskupan yang luas dan memiliki lebih dari 5 ranting aktif guna memperlancar komunikasi dan pembinaan teritorial.',
    masaJabatan: '2 Tahun per Periode',
    bph: [
      'Koordinator Wilayah',
      'Sekretaris Wilayah',
      'Bendahara Wilayah',
      'Seksi Bidang Sesuai Kebutuhan',
    ],
  },
  {
    level: 'Ranting',
    title: 'Koordinatorat Ranting (KORAN)',
    wilayahCakupan: 'Tingkat Paroki',
    deskripsi:
      'Ujung tombak pembinaan langsung bagi para anggota di paroki. Berkoordinasi dengan Pastor Paroki (Moderator Ranting) dan Dewan Karya Pastoral Paroki untuk membina kader muda Katolik.',
    masaJabatan: '2 Tahun per Periode',
    bph: ['Koordinator Ranting', 'Wakil Koordinator Ranting', 'Sekretaris', 'Bendahara'],
    komisi: [
      'Seksi Mensprit & Liturgi',
      'Seksi Kepelatihan & Teknik',
      'Seksi Humas & Dokumentasi',
      'Seksi Usaha Dana & Logistik',
    ],
  },
  {
    level: 'Unit Latihan / Basis',
    title: 'Pengurus Unit Latihan & Basis',
    wilayahCakupan: 'Tingkat Stasi, Lingkungan, Sekolah, atau Perguruan Tinggi',
    deskripsi:
      'Kelengkapan organisasi di bawah naungan Ranting yang menyelenggarakan latihan mingguan berkala di stasi atau institusi pendidikan Katolik.',
    masaJabatan: 'Menyesuaikan Ranting',
    bph: ['Koordinator Unit Latihan', 'Sekretaris Unit', 'Bendahara Unit', 'Pelatih Unit'],
  },
];

export const DEWAN_PENDIRI_DATA: DewanPendiriItem[] = [
  {
    no: 1,
    nama: 'RD. Martinus Hadiwijoyo',
    gelarRole: 'Inisiator Utama & Pendiri Rohani',
    keterangan:
      'Imam Praja KAJ, perintis awal latihan pencak silat rohani di Mertoyudan & Tanjung Priok.',
  },
  {
    no: 2,
    nama: 'RD. Aloysius Gonzaga Luhur Prihadi',
    gelarRole: 'Pendiri (Seminaris Perintis)',
    keterangan: 'Turut serta merintis pembinaan angkatan pertama di Mertoyudan.',
  },
  {
    no: 3,
    nama: 'RD. Richardus Heru Subyakto',
    gelarRole: 'Pendiri (Seminaris Perintis)',
    keterangan: 'Imam dan perintis latihan rohani beladiri masa awal.',
  },
  {
    no: 4,
    nama: 'Dra. Margriet Emmy Putraningrum, M.Psi',
    gelarRole: 'Pendiri Tunggal Hati Maria (THM)',
    keterangan: 'Tokoh utama perintis dan pembina rohani puteri THM.',
  },
  {
    no: 5,
    nama: 'DR. RMS Haripurnomo Kushadiwijoyo, MPh',
    gelarRole: 'Pendiri & Penyusun Kurikulum Awal',
    keterangan:
      'Merumuskan integrasi olah fisik pencak silat dengan nilai-nilai kesehatan dan moral.',
  },
  {
    no: 6,
    nama: 'Brigjen TNI (Purn) Ignatius Imam Kuseno Miharjo',
    gelarRole: 'Pendiri & Penasehat Keorganisasian',
    keterangan: 'Memberikan dasar-dasar kedisiplinan dan kepemimpinan nasional.',
  },
  {
    no: 7,
    nama: 'Ibu Saparti Kuseno Miharjo',
    gelarRole: 'Pendiri & Tokoh Pembina',
    keterangan: 'Mendampingi pembinaan keluarga besar dan kemasyarakatan.',
  },
  {
    no: 8,
    nama: 'Drs. Fransiskus Krisdaryadi Hadisubroto',
    gelarRole: 'Pendiri & Tokoh Senior',
    keterangan: 'Penyusun kurikulum latihan dan penggerak organisasi lintas generasi.',
  },
  {
    no: 9,
    nama: 'Benedictus Wiharto, SH',
    gelarRole: 'Pendiri & Pakar Hukum Organisasi',
    keterangan: 'Perumus konstitusi dan dasar-dasar statuta hukum THS-THM.',
  },
  {
    no: 10,
    nama: 'Yohanes Lilik Subiyanto Dwijosusanto, SPd',
    gelarRole: 'Pendiri & Tokoh Kepelatihan',
    keterangan: 'Pengembang teknik bela diri silat dan pembinaan teknis pesilat.',
  },
  {
    no: 11,
    nama: 'Drs. Y. B. Prasetyo Yudono, MSBA',
    gelarRole: 'Pendiri & Konseptor',
    keterangan: 'Turut menyusun tata kelola manajemen organisasi modern.',
  },
  {
    no: 12,
    nama: 'Stanislaus Kostka R. Adi Satriyo Nugroho, SPd',
    gelarRole: 'Pendiri & Pendidik',
    keterangan: 'Pionir kaderisasi dan pelatihan rohani seminaris.',
  },
  {
    no: 13,
    nama: 'Aloysius Bambang Wahjudi, SIP',
    gelarRole: 'Pendiri & Tokoh Pergerakan',
    keterangan: 'Pengembang jejaring cabang dan keorganisasian pemuda.',
  },
  {
    no: 14,
    nama: 'Drs. Petrus Agus Salim',
    gelarRole: 'Pendiri & Tokoh Pendukung',
    keterangan: 'Penggerak administrasi dan relasi awal di wilayah Tanjung Priok.',
  },
  {
    no: 15,
    nama: 'Dra. C. Sri Wahyu Dramastuti',
    gelarRole: 'Pendiri THM & Pembina Puteri',
    keterangan: 'Pilar pendampingan spiritualitas dan karakter puteri THM.',
  },
  {
    no: 16,
    nama: 'Maria Sri Selastiningsih, SE',
    gelarRole: 'Pendiri THM & Tokoh Manajemen',
    keterangan: 'Penggerak tata kelola kepengurusan awal kaum puteri THM.',
  },
];

export const KATEGORI_USIA_DATA: KategoriUsiaItem[] = [
  {
    kategori: 'Pra-Bina',
    rentangUsia: '9 – 12 Tahun',
    fokusPembinaan:
      'Pengenalan gerak dasar motorik, kedisiplinan doa anak, kepatuhan pada orangtua, dan kegembiraan persaudaraan.',
    keterangan:
      'Kelompok anak-anak sekolah dasar untuk menanamkan benih karakter iman dan cinta olahraga.',
  },
  {
    kategori: 'Anggota Subjek Bina',
    rentangUsia: '13 – 35 Tahun',
    fokusPembinaan:
      'Kaderisasi inti, pendadaran fisik-mental mendalam, penguasaan jurus lengkap, kepemimpinan organisasi, dan kerasulan muda.',
    keterangan:
      'Tulang punggung gerak organisasi di tingkat sekolah, universitas, paroki, dan keuskupan.',
  },
  {
    kategori: 'Anggota Medior',
    rentangUsia: '36 – 55 Tahun',
    fokusPembinaan:
      'Pelatih senior, dewan penasehat ranting/distrik, pembinaan keluarga Katolik, dan penopang karya sosial paroki.',
    keterangan:
      'Kader matang yang mengawal regenerasi dan mendukung pendanaan serta stabilitas organisasi.',
  },
  {
    kategori: 'Anggota Senior',
    rentangUsia: '56 Tahun ke Atas',
    fokusPembinaan:
      'Keteladanan rohani, dewan kehormatan, penjaga kemurnian tradisi dan konstitusi luhur THS-THM.',
    keterangan: 'Para sesepuh dan tokoh panutan spiritual bagi seluruh generasi muda pesilat.',
  },
];

export const JENJANG_SABUK_DATA = [
  {
    tingkat: 'Calon Anggota',
    sabuk: 'Tanpa Sabuk / Seragam Latihan Putih',
    durasi: '6 Bulan Pembinaan Dasar',
    makna:
      'Masa pencarian, pengenalan disiplin organisasi, dan persiapan batin menjelang Retret Pendadaran.',
    warnaBadge: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200',
  },
  {
    tingkat: 'Tingkat Dasar (Sabuk Putih)',
    sabuk: 'Sabuk Putih Polos',
    durasi: '1 Tahun Masa Latihan',
    makna:
      'Melambangkan kesucian niat, kerendahan hati untuk belajar, dan pembersihan diri dari kesombongan duniawi.',
    warnaBadge:
      'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-100',
  },
  {
    tingkat: 'Tingkat Lanjut I (Sabuk Kuning)',
    sabuk: 'Sabuk Kuning Emas',
    durasi: '1 – 2 Tahun Masa Latihan',
    makna:
      'Melambangkan fajar iman yang mulai bersinar, kematangan teknik dasar pencak silat, dan komitmen pelayanan.',
    warnaBadge:
      'bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-200',
  },
  {
    tingkat: 'Tingkat Lanjut II (Sabuk Hijau)',
    sabuk: 'Sabuk Hijau',
    durasi: '2 Tahun Masa Latihan',
    makna:
      'Melambangkan pertumbuhan iman yang subur, kesiapan menjadi teladan bagi adik tingkat, dan penguasaan jurus menengah.',
    warnaBadge:
      'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200',
  },
  {
    tingkat: 'Tingkat Madya (Sabuk Biru)',
    sabuk: 'Sabuk Biru Laut',
    durasi: '2 – 3 Tahun Pengabdian',
    makna:
      'Melambangkan kedalaman batin, ketenangan jiwa, kesetiaan pada Bunda Maria, dan peran sebagai asisten pelatih.',
    warnaBadge: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200',
  },
  {
    tingkat: 'Tingkat Utama (Sabuk Coklat)',
    sabuk: 'Sabuk Coklat',
    durasi: '3 Tahun Pengabdian Khusus',
    makna:
      'Melambangkan kerendahan hati yang menapak tanah bumi, kematangan teknik tingkat tinggi, dan kepemimpinan wilayah.',
    warnaBadge:
      'bg-amber-900/10 text-amber-900 border-amber-400 dark:bg-amber-950 dark:text-amber-200',
  },
  {
    tingkat: 'Tingkat Pendekar (Sabuk Hitam)',
    sabuk: 'Sabuk Hitam / Dewan Guru',
    durasi: 'Pengabdian Seumur Hidup',
    makna:
      'Melambangkan kesempurnaan penguasaan diri, keteguhan iman yang tak tergoyahkan, dan pengabdian total bagi Gereja dan Tanah Air.',
    warnaBadge: 'bg-navy-950 text-gold-300 border-gold-500 dark:bg-black dark:text-gold-400',
  },
];

export const MAKNA_LAMBANG_DATA = {
  ths: {
    nama: 'Lambang Tunggal Hati Seminari (THS)',
    deskripsi:
      'Berbentuk perisai dengan warna merah di setengah bagian atas dan putih di bagian bawah (melambangkan bendera Indonesia dan darah-air pengorbanan Kristus). Di tengah terdapat persilangan tangan Chi bersikap sembahan berwarna putih di atas huruf Rho emas, melambangkan Kristus (Chi-Rho) sebagai pusat doa dan kekuatan batin pesilat.',
  },
  thm: {
    nama: 'Lambang Tunggal Hati Maria (THM)',
    deskripsi:
      'Berbentuk hati dengan warna merah di atas dan putih di bawah yang dirangkai dari untaian rosario biru dengan salib di bagian bawah. Di tengah hati terdapat persilangan tangan Chi memegang bunga melati putih (kesucian) dan kuning (keanggunan rohani) di atas huruf Rho emas, melambangkan kelemahlembutan dan perlindungan keibuan Bunda Maria.',
  },
};
