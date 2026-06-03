import React from 'react';

/**
 * JSX Template Piagam Prestasi A4 Landscape Full Page
 * Data yang dibutuhkan:
 * - penerima
 * - predikat
 * - kegiatan
 * - lokasiKegiatan
 * - waktuKegiatan
 * - tanggalTandaTangan
 * - koordinatorDistrik
 * - teamLeader
 * - logoUrl
 * - ttdKoordinatorUrl
 * - ttdTeamLeaderUrl
 * - capUrl
 * - qrCodeUrl (optional)
 */
export default function PiagamPrestasiA4LandscapeTemplate({
  penerima = 'Nama Penerima',
  predikat = 'Peserta Terbaik',
  kegiatan = 'Pendadaran Calon Anggota THS-THM',
  lokasiKegiatan = 'Lokasi Kegiatan',
  waktuKegiatan = 'Waktu Kegiatan',
  tanggalTandaTangan = 'Tanggal',
  koordinatorDistrik = 'Koordinator Distrik',
  teamLeader = 'Team Leader',
  logoUrl = '/assets/thsthm.svg',
  ttdKoordinatorUrl = '',
  ttdTeamLeaderUrl = '',
  capUrl = '',
  qrCodeUrl = '',
}) {
  return (
    <div style={{ width: '297mm', height: '210mm', position: 'relative', backgroundColor: '#fff', fontFamily: 'Georgia, Times New Roman, serif' }}>
      {/* Logo */}
      <img src={logoUrl} alt="Logo" style={{ position: 'absolute', left: '20mm', top: '20mm', width: '50mm', height: '50mm' }} />

      {/* Judul */}
      <h1 style={{ textAlign: 'center', fontSize: '48px', marginTop: '20mm' }}>Piagam Penghargaan</h1>
      <p style={{ textAlign: 'center', fontSize: '20px', marginTop: '10px' }}>Diberikan Kepada</p>
      <h2 style={{ textAlign: 'center', fontSize: '36px', textTransform: 'uppercase', marginTop: '5px' }}>{penerima}</h2>
      <p style={{ textAlign: 'center', fontSize: '24px', marginTop: '5px' }}>Sebagai {predikat}</p>

      {/* Detail Kegiatan */}
      <div style={{ textAlign: 'center', fontSize: '16px', marginTop: '10px' }}>
        <p>Kegiatan: {kegiatan}</p>
        <p>Lokasi: {lokasiKegiatan}</p>
        <p>Waktu: {waktuKegiatan}</p>
      </div>

      {/* Tanda tangan dan cap */}
      <div style={{ display: 'flex', justifyContent: 'space-around', position: 'absolute', bottom: '20mm', width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          {ttdKoordinatorUrl ? <img src={ttdKoordinatorUrl} alt="TTD Koordinator" style={{ width: '60mm', height: '20mm' }} /> : <div style={{ height: '20mm' }}>TTD</div>}
          <div>{koordinatorDistrik}</div>
          <div>Koordinator Distrik</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          {capUrl ? <img src={capUrl} alt="Cap" style={{ width: '40mm', height: '40mm' }} /> : <div style={{ width: '40mm', height: '40mm', border: '1px solid #000' }}>CAP</div>}
        </div>

        <div style={{ textAlign: 'center' }}>
          {ttdTeamLeaderUrl ? <img src={ttdTeamLeaderUrl} alt="TTD Team Leader" style={{ width: '60mm', height: '20mm' }} /> : <div style={{ height: '20mm' }}>TTD</div>}
          <div>{teamLeader}</div>
          <div>Team Leader</div>
        </div>
      </div>

      {/* QR Code Optional */}
      {qrCodeUrl && <img src={qrCodeUrl} alt="QR" style={{ position: 'absolute', right: '20mm', bottom: '20mm', width: '40mm', height: '40mm' }} />}
    </div>
  );
}
