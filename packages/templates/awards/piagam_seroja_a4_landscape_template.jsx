import React from 'react';

/**
 * JSX Template Piagam Penghargaan Seroja A4 Landscape (297x210mm)
 * Pedoman No 3/2004, VI.3. Lambang perjuangan. Penerbit: Koordinatorat Distrik/Komisariat.
 * - penerima, kegiatanPanitia, tanggalTandaTangan, nomorPiagam
 * - ranting, distrik, koordinatorDistrik, pastorModerator
 */
export default function PiagamSerojaA4LandscapeTemplate({
  penerima = 'Nama Penerima',
  kegiatanPanitia = 'Panitia Kegiatan tingkat Distrik',
  tanggalTandaTangan = 'Tanggal',
  nomorPiagam = 'Nomor',
  ranting = 'Ranting',
  distrik = 'Distrik',
  koordinatorDistrik = 'Koordinator Distrik',
  pastorModerator = 'Pastor Moderator',
  logoUrl = '/assets/thsthm.svg',
  ttdKoordinatorUrl = '',
  ttdModeratorUrl = '',
  capUrl = '',
  qrCodeUrl = '',
}) {
  return (
    <div style={{ width: '297mm', height: '210mm', position: 'relative', backgroundColor: '#fff', fontFamily: 'Georgia, Times New Roman, serif' }}>
      <div style={{ position: 'absolute', left: '10mm', top: '10mm', right: '10mm', bottom: '10mm', border: '3px double #ca8a04', borderRadius: '6px' }} />
      <img src={logoUrl} alt="Logo" style={{ position: 'absolute', left: '20mm', top: '18mm', width: '20mm', height: '20mm' }} />
      <h1 style={{ textAlign: 'center', fontSize: '26pt', fontWeight: 'bold', color: '#0f1f3a', marginTop: '18mm', marginBottom: 0, letterSpacing: '2px' }}>PIAGAM PENGHARGAAN</h1>
      <h2 style={{ textAlign: 'center', fontSize: '14pt', color: '#ca8a04', margin: '1mm 0', letterSpacing: '3px' }}>SEROJA — LAMBANG PERJUANGAN</h2>
      <p style={{ textAlign: 'center', fontSize: '10pt', color: '#64748b', margin: 0 }}>Nomor: {nomorPiagam}</p>
      <p style={{ textAlign: 'center', fontSize: '11pt', margin: '6mm 0 1mm 0' }}>Diberikan dengan bangga kepada</p>
      <h2 style={{ textAlign: 'center', fontSize: '20pt', fontWeight: 'bold', textTransform: 'uppercase', margin: '1mm 0', color: '#0f1f3a' }}>{penerima}</h2>
      <p style={{ textAlign: 'center', fontSize: '10pt', color: '#475569', margin: '1mm 0' }}>{ranting} — {distrik}</p>
      <p style={{ textAlign: 'center', fontSize: '11pt', margin: '3mm 25mm 0 25mm', lineHeight: '1.5' }}>
        Atas dedikasi dan perjuangannya sebagai <strong>{kegiatanPanitia}</strong>. Semoga penghargaan ini menjadi penyemangat untuk terus berjuang demi kejayaan Keluarga Besar THS-THM.
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-around', position: 'absolute', bottom: '18mm', width: '100%' }}>
        <div style={{ textAlign: 'center', width: '55mm' }}>
          {ttdKoordinatorUrl ? <img src={ttdKoordinatorUrl} alt="TTD" style={{ width: '45mm', height: '15mm', objectFit: 'contain' }} /> : <div style={{ height: '15mm' }} />}
          <div style={{ borderTop: '1px solid #333', paddingTop: '1mm' }}>
            <p style={{ fontSize: '10pt', fontWeight: 'bold', margin: 0 }}>{koordinatorDistrik}</p>
            <p style={{ fontSize: '9pt', color: '#555', margin: 0 }}>Koordinator Distrik</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', width: '55mm' }}>
          <p style={{ fontSize: '10pt', color: '#666', margin: '0 0 15mm 0' }}>{tanggalTandaTangan}</p>
        </div>
        <div style={{ textAlign: 'center', width: '55mm' }}>
          {ttdModeratorUrl ? <img src={ttdModeratorUrl} alt="TTD" style={{ width: '45mm', height: '15mm', objectFit: 'contain' }} /> : <div style={{ height: '15mm' }} />}
          <div style={{ borderTop: '1px solid #333', paddingTop: '1mm' }}>
            <p style={{ fontSize: '10pt', fontWeight: 'bold', margin: 0 }}>{pastorModerator}</p>
            <p style={{ fontSize: '9pt', color: '#555', margin: 0 }}>Pastor Moderator</p>
          </div>
        </div>
      </div>
      {qrCodeUrl && <img src={qrCodeUrl} alt="QR" style={{ position: 'absolute', right: '18mm', bottom: '18mm', width: '20mm', height: '20mm' }} />}
    </div>
  );
}
