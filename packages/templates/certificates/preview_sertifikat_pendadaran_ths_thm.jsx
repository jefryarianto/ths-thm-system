import React from "react";

const certificate = {
  organizationName: "TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA",
  districtName: "KOORDINATORAT DISTRIK LARANTUKA",
  certificateNumber: "PD-LRT-2026-0001",
  recipientName: "NAMA CALON ANGGOTA",
  eventTitle: "Pendadaran Calon Anggota Gelombang I",
  location: "Aula Paroki Waikomo",
  ranting: "Kristus Raja Semesta Alam - Watobuku",
  wilayah: "Wilayah Larantuka",
  distrik: "Keuskupan Larantuka",
  issuedPlaceDate: "Larantuka, 20 Juli 2026",
  finalScore: "77.58",
  predicate: "Baik Sekali",
  status: "Lulus",
};

const signers = {
  pastor: {
    name: "RD. YOAKIM D. B. H. ODEL",
    title: "Pastor Moderator",
  },
  koordinator: {
    name: "YOSEPH PEHAN BETAN",
    title: "Koordinator Distrik",
  },
};

const aspects = [
  {
    name: "Wawasan Kebangsaan",
    score: "82.50",
    items: ["Pancasila", "Indonesia Raya"],
  },
  {
    name: "Spiritual",
    score: "78.00",
    items: ["7 Sakramen Gereja", "Santo-Santa Pelindung"],
  },
  {
    name: "Organisasi",
    score: "75.00",
    items: [
      "Hormat Organisasi dan Makna",
      "Sejarah Pendirian",
      "Janji Prasetya",
      "Struktur Umum Organisasi",
      "Doa Spontan",
      "Menghitung Aba-aba",
    ],
  },
  {
    name: "Rekreasi",
    score: "80.00",
    items: ["Mars THS-THM", "Yel-yel dan Viva Organisasi", "Yel-yel kreasi pribadi"],
  },
  {
    name: "Praktek Pencak Silat",
    score: "76.00",
    items: [
      "Kuda-kuda Tinggi/Rendah",
      "Langkah Maju/Mundur",
      "Pola Langkah Segitiga/Segiempat",
      "Pukulan 1, 3, 9",
      "Tangkisan 1, 3, 7",
      "Tendangan Depan/Samping/Sabitan",
      "Kombinasi Gerakan Dasar",
    ],
  },
  {
    name: "Praktek Non Pencak Silat",
    score: "74.00",
    items: ["Lari + Lompat + Sprint 500 m", "Sit Up 10x", "Kayang 40 Detik", "Roll Depan 3x", "Roll Belakang 3x", "Push Up 10x"],
  },
];

export default function PendadaranCertificatePreview() {
  return (
    <div className="min-h-screen bg-slate-100 p-8 flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Preview Sertifikat Pendadaran THS-THM</h1>
        <p className="text-sm text-slate-500 mt-1">A4 landscape, sisi depan dan belakang</p>
      </div>

      <div className="flex flex-col gap-12 items-center">
        <CertificateFront />
        <CertificateBack />
      </div>
    </div>
  );
}

function CertificateShell({ title, children }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <h2 className="font-bold text-slate-700">{title}</h2>
      <div className="relative w-[1188px] h-[840px] bg-white rounded-[28px] overflow-hidden shadow-2xl border border-slate-300 scale-[0.42] sm:scale-[0.55] md:scale-[0.68] lg:scale-[0.78] xl:scale-[0.86] origin-top">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-100" />
        <div className="absolute -top-40 -right-36 w-[520px] h-[520px] rounded-full bg-cyan-300/25" />
        <div className="absolute -bottom-48 -left-40 w-[620px] h-[620px] rounded-full bg-blue-700/12" />
        <div className="absolute inset-[34px] rounded-[22px] border-[4px] border-yellow-400" />
        <div className="absolute inset-[48px] rounded-[16px] border border-blue-800/25" />
        <Watermark />
        <div className="relative z-10 h-full">{children}</div>
      </div>
    </div>
  );
}

function Watermark() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.045]">
      <div className="w-[430px] h-[430px] rounded-full border-[30px] border-blue-900 flex items-center justify-center text-[90px] font-black text-blue-900">
        THS
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="w-24 h-24 rounded-full bg-yellow-300 border-[7px] border-slate-900 flex items-center justify-center shadow-md">
      <div className="w-16 h-16 rounded-full bg-white border border-slate-700 flex items-center justify-center text-[20px] font-black text-blue-800">
        THS
      </div>
    </div>
  );
}

function QrMini() {
  return (
    <div className="w-24 h-24 bg-white rounded-lg p-2 border-2 border-blue-900 shadow-sm">
      <div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-1">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className={`${i % 2 === 0 || i % 7 === 0 ? "bg-slate-900" : "bg-slate-200"} rounded-sm`} />
        ))}
      </div>
    </div>
  );
}

function CertificateFront() {
  return (
    <CertificateShell title="Sisi Depan Sertifikat">
      <div className="absolute top-14 left-20 right-20 flex items-center justify-between">
        <Logo />
        <div className="text-center flex-1">
          <div className="text-[30px] font-black tracking-wide text-blue-950">{certificate.organizationName}</div>
          <div className="text-[24px] font-bold text-blue-800 mt-1">{certificate.districtName}</div>
        </div>
        <QrMini />
      </div>

      <div className="absolute top-[180px] left-0 right-0 text-center">
        <div className="text-[62px] font-black tracking-[0.14em] text-blue-950">SERTIFIKAT</div>
        <div className="mt-1 text-[34px] font-black tracking-[0.18em] text-yellow-600">PENDADARAN</div>
        <div className="mt-4 text-[17px] text-slate-600">Nomor Sertifikat: {certificate.certificateNumber}</div>
      </div>

      <div className="absolute top-[345px] left-24 right-24 text-center text-slate-700">
        <div className="text-[22px]">Diberikan kepada</div>
        <div className="mt-4 inline-block px-16 py-4 rounded-2xl bg-white/90 border border-blue-200 shadow-sm">
          <div className="text-[48px] font-black text-blue-950 tracking-wide">{certificate.recipientName}</div>
        </div>
        <div className="mt-7 text-[24px] leading-relaxed">
          atas kelulusan dalam kegiatan Pendadaran di <span className="font-black text-blue-900">{certificate.location}</span>
        </div>
      </div>

      <div className="absolute left-24 right-24 top-[540px] grid grid-cols-3 gap-4 text-[18px] text-slate-700">
        <InfoBox label="Ranting" value={certificate.ranting} />
        <InfoBox label="Wilayah" value={certificate.wilayah} />
        <InfoBox label="Distrik" value={certificate.distrik} />
      </div>

      <div className="absolute left-24 right-24 top-[640px] grid grid-cols-3 gap-4 text-center">
        <InfoBox label="Nilai Akhir" value={certificate.finalScore} highlight />
        <InfoBox label="Predikat" value={certificate.predicate} highlight />
        <InfoBox label="Status" value={certificate.status} highlight />
      </div>

      <div className="absolute left-24 right-24 bottom-20 flex justify-between items-end text-center text-slate-800">
        <SignerBlock title={signers.pastor.title} name={signers.pastor.name} />
        <div className="text-[18px] font-semibold text-slate-700 pb-4">{certificate.issuedPlaceDate}</div>
        <SignerBlock title={signers.koordinator.title} name={signers.koordinator.name} />
      </div>
    </CertificateShell>
  );
}

function CertificateBack() {
  return (
    <CertificateShell title="Sisi Belakang Sertifikat">
      <div className="absolute top-16 left-0 right-0 text-center">
        <div className="text-[40px] font-black text-blue-950 tracking-[0.12em]">RINCIAN PENILAIAN PENDADARAN</div>
        <div className="text-[16px] text-slate-500 mt-2">Nilai item 55–90, nilai aspek dihitung dari rata-rata item</div>
      </div>

      <div className="absolute top-[145px] left-20 right-20 grid grid-cols-2 gap-5">
        {aspects.map((aspect) => (
          <div key={aspect.name} className="bg-white/85 border border-blue-200 rounded-2xl p-4 shadow-sm min-h-[136px]">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="text-[19px] font-black text-blue-950">{aspect.name}</div>
              <div className="px-3 py-1 rounded-full bg-blue-900 text-white text-[14px] font-bold">Nilai: {aspect.score}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-slate-700">
              {aspect.items.map((item) => (
                <div key={item} className="truncate">• {item}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute left-20 right-20 bottom-20 bg-gradient-to-r from-blue-950 via-blue-800 to-cyan-600 rounded-2xl p-5 text-white shadow-lg flex items-center justify-between">
        <div>
          <div className="text-[16px] opacity-90">Ringkasan Hasil</div>
          <div className="text-[26px] font-black mt-1">Nilai Akhir {certificate.finalScore} · {certificate.predicate} · {certificate.status}</div>
          <div className="text-[14px] opacity-90 mt-2">Predikat: 55–65 Cukup, 66–75 Baik, 76–90 Baik Sekali</div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right text-[14px] opacity-95">
            <div>Sertifikat tampil di detail profil user.</div>
            <div>Jika belum tersedia: Sertifikat Pendadaran tidak tersedia.</div>
          </div>
          <QrMini />
        </div>
      </div>
    </CertificateShell>
  );
}

function InfoBox({ label, value, highlight = false }) {
  return (
    <div className="rounded-2xl bg-white/80 border border-blue-200 px-5 py-3 shadow-sm">
      <div className="text-[13px] uppercase tracking-wide text-slate-500 font-bold">{label}</div>
      <div className={`${highlight ? "text-[28px]" : "text-[17px]"} font-black text-blue-950 mt-1`}>{value}</div>
    </div>
  );
}

function SignerBlock({ title, name }) {
  return (
    <div className="w-[280px]">
      <div className="relative h-[86px]">
        <div className="absolute left-10 top-1 text-[52px] font-[cursive] rotate-[-8deg] text-slate-900/80">ttd</div>
        <div className="absolute right-8 top-0 w-20 h-20 rounded-full border-4 border-blue-400/70 flex items-center justify-center text-[10px] font-black text-blue-600/80 rotate-[-12deg]">STEMPEL</div>
      </div>
      <div className="border-t border-slate-500 pt-2">
        <div className="text-[17px] font-black text-blue-950">{name}</div>
        <div className="text-[14px] font-semibold text-slate-600">{title}</div>
      </div>
    </div>
  );
}
