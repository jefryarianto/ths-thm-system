import React from "react";

const member = {
  nama: "APOLONIUS PEKA TAPUN",
  nomorAnggota: "LRT-0115-017-2023",
  ranting: "Kristus Raja Semesta Alam - Watobuku",
  wilayah: "Wilayah Larantuka",
  distrik: "Keuskupan Larantuka",
  tanggalLahir: "Waijarang, 20 Juli 2007",
  dadar: "Waikomo, 2019",
  status: "Aktif",
  validUntil: "13 Juli 2030",
};

const cardConfig = {
  organizationName: "TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA",
  districtHeader: `DISTRIK ${member.distrik.toUpperCase()}`,
  signerName: "YOSEPH PEHAN BETAN",
  signerTitle: "Koordinator Distrik",
};

const levelVisual = {
  name: "Tamtama",
  label: "Balok Biru II",
  stripCount: 2,
  stripColorClass: "bg-blue-700",
  stripBorderClass: "border-blue-900",
};

export default function MemberCardPreview() {
  return (
    <div className="min-h-screen bg-slate-100 p-8 flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Preview Desain Kartu Anggota THS-THM</h1>
        <p className="text-sm text-slate-500 mt-1">Desain modern CR80 landscape, sisi depan dan belakang</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        <CardFront />
        <CardBack />
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="w-12 h-12 rounded-full bg-yellow-300 border-4 border-slate-900 flex items-center justify-center shadow-sm">
      <div className="w-8 h-8 rounded-full bg-white border border-slate-700 flex items-center justify-center text-[9px] font-black text-blue-800">
        THS
      </div>
    </div>
  );
}

function LevelStrips({ level }) {
  return (
    <div className="absolute left-10 top-[412px] w-[185px] flex flex-col gap-[6px]">
      {Array.from({ length: level.stripCount }).map((_, index) => (
        <div
          key={index}
          className={`h-[14px] w-full rounded-sm border ${level.stripColorClass} ${level.stripBorderClass} shadow-sm`}
        />
      ))}
    </div>
  );
}

function Watermark() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06]">
      <div className="w-60 h-60 rounded-full border-[18px] border-blue-900 flex items-center justify-center text-5xl font-black text-blue-900">
        THS
      </div>
    </div>
  );
}

function CardShell({ title, children }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <h2 className="font-bold text-slate-700">{title}</h2>
      <div className="relative w-[856px] h-[540px] rounded-[28px] overflow-hidden shadow-2xl border border-slate-300 bg-white scale-[0.42] sm:scale-[0.58] md:scale-[0.72] lg:scale-[0.84] xl:scale-[0.62] origin-top">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-100" />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-cyan-300/30" />
        <div className="absolute -bottom-28 -left-20 w-96 h-96 rounded-full bg-blue-700/15" />
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-blue-900 via-blue-700 to-cyan-500" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-r from-blue-950 via-blue-800 to-cyan-600" />
        <div className="absolute inset-[18px] rounded-[20px] border-2 border-yellow-400/80" />
        <Watermark />
        <div className="relative z-10 h-full">{children}</div>
      </div>
    </div>
  );
}

function CardFront() {
  return (
    <CardShell title="Sisi Depan">
      <div className="px-10 pt-6 flex items-start gap-5 text-white">
        <Logo />
        <div className="leading-tight pt-1">
          <div className="text-[22px] font-black tracking-wide">{cardConfig.organizationName}</div>
          <div className="text-[17px] font-semibold opacity-95">{cardConfig.districtHeader}</div>
        </div>
      </div>

      <div className="absolute top-[92px] left-0 right-0 text-center">
        <div className="inline-block px-8 py-2 rounded-full bg-white/90 border border-yellow-500 shadow-sm">
          <span className="text-[24px] font-black tracking-[0.18em] text-blue-900">KARTU TANDA ANGGOTA</span>
        </div>
      </div>

      <div className="absolute left-10 top-[165px] w-[185px] h-[235px] rounded-2xl bg-slate-200 border-4 border-white shadow-lg overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
          FOTO
        </div>
      </div>
      <LevelStrips level={levelVisual} />

      <div className="absolute left-[255px] top-[162px] right-10 text-slate-800">
        <InfoRow label="Nama" value={member.nama} strong />
        <InfoRow label="No. Anggota" value={member.nomorAnggota} />
        <InfoRow label="Ranting" value={member.ranting} />
        <InfoRow label="Wilayah" value={member.wilayah} />
        <InfoRow label="Distrik" value={member.distrik} />
      </div>

      <div className="absolute left-10 bottom-10 text-white">
        <div className="text-[15px] opacity-90">Berlaku sampai</div>
        <div className="text-[22px] font-black">{member.validUntil}</div>
      </div>

      <div className="absolute right-12 bottom-9 text-center text-white">
        <div className="relative h-20 w-48">
          <div className="absolute left-8 top-0 text-4xl font-[cursive] rotate-[-8deg] text-slate-900/80">ttd</div>
          <div className="absolute right-0 top-0 w-20 h-20 rounded-full border-4 border-blue-200/80 flex items-center justify-center text-[10px] font-bold text-blue-100 rotate-[-12deg]">STEMPEL</div>
        </div>
        <div className="text-[16px] font-black border-t border-white/60 pt-1">{cardConfig.signerName}</div>
        <div className="text-[13px] font-semibold opacity-95">{cardConfig.signerTitle}</div>
      </div>
    </CardShell>
  );
}

function CardBack() {
  return (
    <CardShell title="Sisi Belakang">
      <div className="absolute top-7 left-0 right-0 text-center text-white">
        <div className="text-[28px] font-black tracking-[0.16em]">VERIFIKASI KARTU ANGGOTA</div>
        <div className="text-[15px] opacity-90 mt-1">Scan QR untuk memeriksa keabsahan anggota</div>
      </div>

      <div className="absolute left-12 top-[145px] w-[210px] h-[210px] bg-white rounded-2xl border-4 border-blue-900 shadow-lg p-4">
        <div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-1">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className={`${i % 3 === 0 || i % 7 === 0 ? "bg-slate-900" : "bg-slate-200"} rounded-sm`} />
          ))}
        </div>
      </div>

      <div className="absolute left-[300px] top-[145px] right-12 text-slate-800">
        <div className="bg-white/85 rounded-2xl border border-blue-200 p-6 shadow-sm">
          <p className="text-[18px] leading-relaxed text-slate-700 mb-4">
            Halaman verifikasi publik hanya menampilkan data minimum untuk membuktikan keabsahan anggota.
          </p>
          <BackRow label="TTL" value={member.tanggalLahir} />
          <BackRow label="DADAR" value={member.dadar} />
          <BackRow label="Status" value={member.status} />
          <BackRow label="Valid s/d" value={member.validUntil} />
        </div>
      </div>

      <div className="absolute left-12 right-12 bottom-8 text-white flex items-end justify-between gap-6">
        <div className="max-w-[610px] text-[15px] leading-relaxed opacity-95">
          Jika kartu ini ditemukan, harap menghubungi sekretariat THS-THM Distrik Keuskupan Larantuka.
        </div>
        <div className="text-right">
          <div className="text-[13px] opacity-80">URL Verifikasi</div>
          <div className="text-[16px] font-bold">/verify/member/token</div>
        </div>
      </div>
    </CardShell>
  );
}

function InfoRow({ label, value, strong = false }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 mt-3 items-start">
      <div className="text-[18px] font-bold text-blue-950">{label}</div>
      <div className={`${strong ? "text-[25px] font-black text-blue-950" : "text-[18px] font-semibold text-slate-800"}`}>: {value}</div>
    </div>
  );
}

function BackRow({ label, value }) {
  return (
    <div className="grid grid-cols-[105px_1fr] gap-2 text-[18px] mb-3">
      <div className="font-black text-blue-950">{label}</div>
      <div className="font-semibold">: {value}</div>
    </div>
  );
}
