import React from 'react';

/**
 * JSX Template Piagam Penghargaan Mawar A4 Landscape (297x210mm)
 * Pedoman No 3/2004, VI.5 + Lampiran 13. Lambang kesucian dan kemuliaan.
 * Penerbit: Dewan Pendiri. Penandatangan: Dewan Pendiri + Koordinator Nasional + Moderator Nasional.
 * Diberikan tiap 5 tahun saat Sidang Nasional.
 * - penerima, jasaDetail, tanggalTandaTangan, nomorPiagam, ranting, distrik
 */
export default function PiagamMawarA4LandscapeTemplate({
  penerima = 'Nama Penerima',
  jasaDetail = 'pendampingan, pembimbingan, pembinaan, dan kebersamaan',
  tanggalTandaTangan = 'Tanggal',
  nomorPiagam = 'Nomor',
  ranting = 'Ranting',
  distrik = 'Distrik',
  dewanPendiri = 'Dewan Pendiri',
  koordinatorNasional = 'Koordinator Nasional',
  moderatorNasional = 'Moderator Nasional',
  logoUrl = '/assets/thsthm.svg',
  ttdDewanUrl = '',
  ttdKoordinatorUrl = '',
  ttdModeratorUrl = '',
  capUrl = '',
  qrCodeUrl = '',
}) {
  return (
    <div style={{ width: '297mm', height: '210mm', position: 'relative', backgroundColor: '#fff', fontFamily: 'Georgia, Times New Roman, serif' }}>
      <div style={{ position: 'absolute', left: '10mm', top: '10mm', right: '10mm', bottom: '10mm', border: '3px double #ca8a04', borderRadius: '6px' }} />
      <img src={logoUrl} alt="Logo" style={{ position: 'absolute', left: '20mm', top: '18mm', width: '20mm', height: '20mm' }} />
      <h1 style={{ textAlign: 'center', fontSize: '26pt', fontWeight: 'bold', color: '#0f1f3a', marginTop: '16mm', marginBottom: 0, letterSpacing: '2px' }}>PENGHARGAAN MAWAR</h1>
      <h2 style={{ textAlign: 'center', fontSize: '12pt', color: '#ca8a04', margin: '1mm 0', letterSpacing: '2px' }}>LAMBANG KESUCIAN DAN KEMULIAAN</h2>
      <p style={{ textAlign: 'center', fontSize: '10pt', fontStyle: 'italic', color: '#64748b', margin: '1mm 0' }}>&ldquo;Kurangkai mawar yang harum semerbak, lambang kasihku padamu, Bunda. Ave Maria!&rdquo;</p>
      <p style={{ textAlign: 'center', fontSize: '10pt', color: '#64748b', margin: 0 }}>Nomor: {nomorPiagam}</p>
      <p style={{ textAlign: 'center', fontSize: '11pt', fontWeight: 'bold', color: '#1e3a5f', margin: '3mm 0 0 0' }}>Gloria, Berdasarkan Keputusan Bersama Dewan Pendiri dan Koordinatorat Nasional,</p>
      <p style={{ textAlign: 'center', fontSize: '10pt', margin: '1mm 0' }}>dengan penuh kebanggaan kami memberikan Penghargaan kepada</p>
      <h2 style={{ textAlign: 'center', fontSize: '19pt', fontWeight: 'bold', textTransform: 'uppercase', margin: '1mm 0', color: '#0f1f3a' }}>{penerima}</h2>
      <p style={{ textAlign: 'center', fontSize: '10pt', color: '#475569', margin: 0 }}>{ranting} — {distrik}</p>
      <p style={{ textAlign: 'center', fontSize: '10pt', margin: '2mm 25mm 0 25mm', lineHeight: '1.5' }}>
        Atas berbagai bentuk {jasaDetail} yang diberikan dengan senang hati dalam ikatan Keluarga Besar THS-THM. Semoga Penghargaan ini mampu mewujudkan cinta kasih Bunda Maria yang suci-mulia seperti semerbaknya mawar menyambut sang fajar. Deo Gratias.
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-around', position: 'absolute', bottom: '14mm', width: '100%' }}>
        <div style={{ textAlign: 'center', width: '50mm' }}>
          {ttdDewanUrl ? <img src={ttdDewanUrl} alt="TTD" style={{ width: '42mm', height: '13mm', objectFit: 'contain' }} /> : <div style={{ height: '13mm' }} />}
          <div style={{ borderTop: '1px solid #333', paddingTop: '1mm' }}>
            <p style={{ fontSize: '9pt', fontWeight: 'bold', margin: 0 }}>{dewanPendiri}</p>
            <p style={{ fontSize: '8pt', color: '#555', margin: 0 }}>Dewan Pendiri</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', width: '50mm' }}>
          {ttdKoordinatorUrl ? <img src={ttdKoordinatorUrl} alt="TTD" style={{ width: '42mm', height: '13mm', objectFit: 'contain' }} /> : <div style={{ height: '13mm' }} />}
          <div style={{ borderTop: '1px solid #333', paddingTop: '1mm' }}>
            <p style={{ fontSize: '9pt', fontWeight: 'bold', margin: 0 }}>{koordinatorNasional}</p>
            <p style={{ fontSize: '8pt', color: '#555', margin: 0 }}>Koordinator Nasional</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', width: '50mm' }}>
          {ttdModeratorUrl ? <img src={ttdModeratorUrl} alt="TTD" style={{ width: '42mm', height: '13mm', objectFit: 'contain' }} /> : <div style={{ height: '13mm' }} />}
          <div style={{ borderTop: '1px solid #333', paddingTop: '1mm' }}>
            <p style={{ fontSize: '9pt', fontWeight: 'bold', margin: 0 }}>{moderatorNasional}</p>
            <p style={{ fontSize: '8pt', color: '#555', margin: 0 }}>Moderator Nasional</p>
          </div>
        </div>
      </div>
      <p style={{ position: 'absolute', left: '18mm', bottom: '14mm', fontSize: '9pt', color: '#666' }}>{tanggalTandaTangan}</p>
      {qrCodeUrl && <img src={qrCodeUrl} alt="QR" style={{ position: 'absolute', right: '18mm', bottom: '14mm', width: '18mm', height: '18mm' }} />}
    </div>
  );
}
