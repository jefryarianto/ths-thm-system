import React from 'react';

/**
 * JSX Template Piagam Penghargaan Melati A4 Landscape (297x210mm)
 * Pedoman No 3/2004, VI.4. Lambang kesetiaan. Tingkat 1 (5 th) — 5 (40 th).
 * - penerima, tingkat (1-5), masaAktif, kalimatMasa (narasi lampiran 8-12)
 * - tanggalTandaTangan, nomorPiagam, ranting, distrik
 */
const MELATI_DEFAULT = {
  1: 'Lima tahun telah berlalu, penuh kerja keras, bersimbah peluh berurai air mata haru dan bahagia.',
  2: 'Sepuluh tahun telah berlalu, penuh kerja keras, bersimbah peluh berurai air mata haru dan bahagia.',
  3: 'Dua puluh tahun telah berlalu, penuh kerja keras, bersimbah peluh berurai air mata haru dan bahagia.',
  4: 'Tiga puluh tahun telah berlalu, penuh kerja keras, bersimbah peluh berurai air mata haru dan bahagia.',
  5: 'Empat puluh tahun telah berlalu, penuh kerja keras, bersimbah peluh berurai air mata haru dan bahagia.',
};

export default function PiagamMelatiA4LandscapeTemplate({
  penerima = 'Nama Penerima',
  tingkat = 1,
  masaAktif = '5 tahun',
  kalimatMasa = '',
  tanggalTandaTangan = 'Tanggal',
  nomorPiagam = 'Nomor',
  ranting = 'Ranting',
  distrik = 'Distrik',
  penandatanganSatu = 'Penandatangan Satu',
  jabatanSatu = 'Jabatan Satu',
  penandatanganDua = 'Penandatangan Dua',
  jabatanDua = 'Jabatan Dua',
  logoUrl = '/assets/thsthm.svg',
  ttdSatuUrl = '',
  ttdDuaUrl = '',
  capUrl = '',
  qrCodeUrl = '',
}) {
  const narasi = kalimatMasa || MELATI_DEFAULT[tingkat] || MELATI_DEFAULT[1];
  return (
    <div style={{ width: '297mm', height: '210mm', position: 'relative', backgroundColor: '#fff', fontFamily: 'Georgia, Times New Roman, serif' }}>
      <div style={{ position: 'absolute', left: '10mm', top: '10mm', right: '10mm', bottom: '10mm', border: '3px double #ca8a04', borderRadius: '6px' }} />
      <img src={logoUrl} alt="Logo" style={{ position: 'absolute', left: '20mm', top: '18mm', width: '20mm', height: '20mm' }} />
      <h1 style={{ textAlign: 'center', fontSize: '26pt', fontWeight: 'bold', color: '#0f1f3a', marginTop: '16mm', marginBottom: 0, letterSpacing: '2px' }}>PIAGAM MELATI</h1>
      <h2 style={{ textAlign: 'center', fontSize: '12pt', color: '#ca8a04', margin: '1mm 0', letterSpacing: '2px' }}>TINGKAT {tingkat} — MASA AKTIF {masaAktif} — LAMBANG KESETIAAN</h2>
      <p style={{ textAlign: 'center', fontSize: '10pt', color: '#64748b', margin: 0 }}>Nomor: {nomorPiagam}</p>
      <p style={{ textAlign: 'center', fontSize: '12pt', fontWeight: 'bold', color: '#1e3a5f', margin: '3mm 0 0 0' }}>Gloria,</p>
      <p style={{ textAlign: 'center', fontSize: '10pt', margin: '2mm 25mm 0 25mm', lineHeight: '1.5' }}>{narasi}</p>
      <p style={{ textAlign: 'center', fontSize: '10pt', margin: '1mm 25mm' }}>Terikat tali persaudaraan sejati Keluarga Besar THS-THM, kami persembahkan penghargaan melati lambang kesetiaan ini pada sahabat kami:</p>
      <h2 style={{ textAlign: 'center', fontSize: '19pt', fontWeight: 'bold', textTransform: 'uppercase', margin: '1mm 0', color: '#0f1f3a' }}>{penerima}</h2>
      <p style={{ textAlign: 'center', fontSize: '10pt', color: '#475569', margin: 0 }}>{ranting} — {distrik}</p>
      <p style={{ textAlign: 'center', fontSize: '10pt', margin: '2mm 25mm 0 25mm' }}>Semoga kesetiaan pada Keluarga Besar ini semakin meningkatkan pengabdian pada tugas pelayanan menjadi garam dan terang dunia. Deo Gratias.</p>
      <div style={{ display: 'flex', justifyContent: 'space-around', position: 'absolute', bottom: '16mm', width: '100%' }}>
        <div style={{ textAlign: 'center', width: '55mm' }}>
          {ttdSatuUrl ? <img src={ttdSatuUrl} alt="TTD" style={{ width: '45mm', height: '14mm', objectFit: 'contain' }} /> : <div style={{ height: '14mm' }} />}
          <div style={{ borderTop: '1px solid #333', paddingTop: '1mm' }}>
            <p style={{ fontSize: '10pt', fontWeight: 'bold', margin: 0 }}>{penandatanganSatu}</p>
            <p style={{ fontSize: '9pt', color: '#555', margin: 0 }}>{jabatanSatu}</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', width: '55mm' }}>
          <p style={{ fontSize: '10pt', color: '#666', margin: '0 0 14mm 0' }}>{tanggalTandaTangan}</p>
        </div>
        <div style={{ textAlign: 'center', width: '55mm' }}>
          {ttdDuaUrl ? <img src={ttdDuaUrl} alt="TTD" style={{ width: '45mm', height: '14mm', objectFit: 'contain' }} /> : <div style={{ height: '14mm' }} />}
          <div style={{ borderTop: '1px solid #333', paddingTop: '1mm' }}>
            <p style={{ fontSize: '10pt', fontWeight: 'bold', margin: 0 }}>{penandatanganDua}</p>
            <p style={{ fontSize: '9pt', color: '#555', margin: 0 }}>{jabatanDua}</p>
          </div>
        </div>
      </div>
      {qrCodeUrl && <img src={qrCodeUrl} alt="QR" style={{ position: 'absolute', right: '18mm', bottom: '16mm', width: '20mm', height: '20mm' }} />}
    </div>
  );
}
