import React from 'react';

/**
 * JSX Template Sertifikat Penguji A4 Portrait (210x297mm)
 * Pedoman No 3/2004, Lampiran 6. Penandatangan: Dewan Pendiri + Koordinator Nasional.
 * - penerima, jenjangPenguji, tanggalTandaTangan, nomorSertifikat, ranting, distrik
 */
export default function SertifikatPengujiA4PortraitTemplate({
  penerima = 'Nama Penerima',
  jenjangPenguji = 'I (Pratama)',
  tanggalTandaTangan = 'Tanggal',
  nomorSertifikat = 'Nomor',
  ranting = 'Ranting',
  distrik = 'Distrik',
  dewanPendiri = 'Dewan Pendiri',
  koordinatorNasional = 'Koordinator Nasional',
  logoUrl = '/assets/thsthm.svg',
  ttdDewanUrl = '',
  ttdKoordinatorUrl = '',
  capUrl = '',
  qrCodeUrl = '',
}) {
  return (
    <div style={{ width: '210mm', minHeight: '297mm', position: 'relative', backgroundColor: '#fff', fontFamily: 'Georgia, Times New Roman, serif', padding: '20mm 18mm', boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', left: '8mm', top: '8mm', right: '8mm', bottom: '8mm', border: '3px double #ca8a04', borderRadius: '6px' }} />
      <div style={{ textAlign: 'center' }}>
        <img src={logoUrl} alt="Logo" style={{ width: '22mm', height: '22mm', objectFit: 'contain' }} />
        <h1 style={{ fontSize: '13pt', fontWeight: 'bold', color: '#0f1f3a', margin: '2mm 0 0 0' }}>TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA</h1>
        <p style={{ fontSize: '10pt', color: '#1e3a5f', margin: '1mm 0 0 0', fontWeight: 'bold' }}>DEWAN PENDIRI - KOORDINATORAT NASIONAL</p>
        <div style={{ width: '100%', height: '2px', backgroundColor: '#ca8a04', marginTop: '3mm' }} />
      </div>
      <div style={{ textAlign: 'center', marginTop: '6mm' }}>
        <h2 style={{ fontSize: '20pt', fontWeight: 'bold', color: '#0f1f3a', margin: 0, letterSpacing: '2px' }}>SERTIFIKAT</h2>
        <h3 style={{ fontSize: '14pt', fontWeight: 'bold', color: '#ca8a04', margin: '1mm 0', letterSpacing: '3px' }}>PENGUJI</h3>
        <p style={{ fontSize: '10pt', color: '#64748b', margin: '1mm 0 0 0' }}>Nomor: {nomorSertifikat}</p>
      </div>
      <p style={{ textAlign: 'center', fontSize: '11pt', margin: '6mm 0 2mm 0' }}>Sertifikat ini diberikan kepada</p>
      <h2 style={{ textAlign: 'center', fontSize: '18pt', fontWeight: 'bold', textTransform: 'uppercase', margin: '2mm 0', color: '#0f1f3a' }}>{penerima}</h2>
      <p style={{ textAlign: 'center', fontSize: '10pt', color: '#475569', margin: '1mm 0' }}>{ranting} — {distrik}</p>
      <p style={{ textAlign: 'center', fontSize: '11pt', margin: '4mm 0' }}>
        Yang telah memenuhi kualifikasi sebagai <strong>Penguji tingkat {jenjangPenguji}</strong>.
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12mm' }}>
        <div style={{ textAlign: 'center', width: '55mm' }}>
          {ttdDewanUrl ? <img src={ttdDewanUrl} alt="TTD" style={{ width: '45mm', height: '15mm', objectFit: 'contain' }} /> : <div style={{ height: '15mm' }} />}
          <div style={{ borderTop: '1px solid #333', paddingTop: '1mm' }}>
            <p style={{ fontSize: '10pt', fontWeight: 'bold', margin: 0 }}>{dewanPendiri}</p>
            <p style={{ fontSize: '9pt', color: '#555', margin: 0 }}>Dewan Pendiri</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', width: '55mm' }}>
          {ttdKoordinatorUrl ? <img src={ttdKoordinatorUrl} alt="TTD" style={{ width: '45mm', height: '15mm', objectFit: 'contain' }} /> : <div style={{ height: '15mm' }} />}
          <div style={{ borderTop: '1px solid #333', paddingTop: '1mm' }}>
            <p style={{ fontSize: '10pt', fontWeight: 'bold', margin: 0 }}>{koordinatorNasional}</p>
            <p style={{ fontSize: '9pt', color: '#555', margin: 0 }}>Koordinator Nasional</p>
          </div>
        </div>
      </div>
      <p style={{ textAlign: 'right', fontSize: '10pt', color: '#666', marginTop: '4mm' }}>{tanggalTandaTangan}</p>
      {qrCodeUrl && <img src={qrCodeUrl} alt="QR" style={{ position: 'absolute', left: '18mm', bottom: '18mm', width: '22mm', height: '22mm' }} />}
    </div>
  );
}
