import React from 'react';

/**
 * JSX Template Sertifikat Pelatihan A4 Landscape Full Page
 * Data yang dibutuhkan:
 * - penerima
 * - namaPelatihan
 * - lokasiPelatihan
 * - waktuPelatihan (tanggal mulai - selesai)
 * - tanggalTandaTangan
 * - koordinatorDistrik
 * - pelatih
 * - logoUrl
 * - ttdKoordinatorUrl
 * - ttdPelatihUrl
 * - capUrl
 * - qrCodeUrl (optional)
 */
export default function SertifikatPelatihanA4LandscapeTemplate({
  penerima = 'Nama Penerima',
  namaPelatihan = 'Pelatihan Dasar THS-THM',
  lokasiPelatihan = 'Lokasi Pelatihan',
  waktuPelatihan = 'Waktu Pelatihan',
  tanggalTandaTangan = 'Tanggal',
  koordinatorDistrik = 'Koordinator Distrik',
  pelatih = 'Pelatih',
  logoUrl = '/assets/thsthm.svg',
  ttdKoordinatorUrl = '',
  ttdPelatihUrl = '',
  capUrl = '',
  qrCodeUrl = '',
}) {
  return (
    <div
      style={{
        width: '297mm',
        height: '210mm',
        position: 'relative',
        backgroundColor: '#fff',
        fontFamily: 'Georgia, Times New Roman, serif',
      }}
    >
      {/* Border luar */}
      <div
        style={{
          position: 'absolute',
          left: '10mm',
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          border: '3px solid #1e3a5f',
          borderRadius: '8px',
        }}
      />

      {/* Border dalam */}
      <div
        style={{
          position: 'absolute',
          left: '14mm',
          top: '14mm',
          right: '14mm',
          bottom: '14mm',
          border: '1px solid #1e3a5f',
          borderRadius: '4px',
        }}
      />

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: '20mm',
          left: '30mm',
          right: '30mm',
          textAlign: 'center',
        }}
      >
        <img
          src={logoUrl}
          alt="Logo"
          style={{ width: '40mm', height: '40mm', objectFit: 'contain' }}
        />
        <h1
          style={{
            fontSize: '28pt',
            fontWeight: 'bold',
            color: '#1e3a5f',
            margin: '8mm 0 2mm 0',
          }}
        >
          SERTIFIKAT PELATIHAN
        </h1>
        <p
          style={{
            fontSize: '12pt',
            color: '#555',
            margin: 0,
          }}
        >
          Diberikan kepada:
        </p>
      </div>

      {/* Nama Penerima */}
      <div
        style={{
          position: 'absolute',
          top: '58mm',
          left: '30mm',
          right: '30mm',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: '24pt',
            fontWeight: 'bold',
            color: '#1e3a5f',
            margin: 0,
            borderBottom: '2px solid #facc15',
            display: 'inline-block',
            padding: '0 10mm',
          }}
        >
          {penerima}
        </h2>
      </div>

      {/* Detail Pelatihan */}
      <div
        style={{
          position: 'absolute',
          top: '75mm',
          left: '30mm',
          right: '30mm',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: '12pt',
            color: '#333',
            margin: '2mm 0',
          }}
        >
          Telah mengikuti pelatihan <strong>{namaPelatihan}</strong>
        </p>
        <p
          style={{
            fontSize: '11pt',
            color: '#555',
            margin: '1mm 0',
          }}
        >
          yang diselenggarakan pada {waktuPelatihan} di {lokasiPelatihan}
        </p>
        <p
          style={{
            fontSize: '11pt',
            color: '#555',
            margin: '1mm 0',
          }}
        >
          dan telah menyelesaikan seluruh materi dengan baik
        </p>
      </div>

      {/* QR Code (opsional) */}
      {qrCodeUrl && (
        <div
          style={{
            position: 'absolute',
            bottom: '35mm',
            right: '30mm',
            textAlign: 'center',
          }}
        >
          <img
            src={qrCodeUrl}
            alt="QR"
            style={{ width: '22mm', height: '22mm' }}
          />
          <p style={{ fontSize: '7pt', color: '#888', margin: '1mm 0 0 0' }}>
            Scan untuk verifikasi
          </p>
        </div>
      )}

      {/* Tanda Tangan */}
      <div
        style={{
          position: 'absolute',
          bottom: '25mm',
          left: '30mm',
          right: '30mm',
          flexDirection: 'row',
          justifyContent: 'space-around',
        }}
      >
        <div style={{ textAlign: 'center', width: '35mm' }}>
          {ttdKoordinatorUrl && (
            <img
              src={ttdKoordinatorUrl}
              alt="TTD Koordinator"
              style={{ width: '30mm', height: '15mm', objectFit: 'contain' }}
            />
          )}
          <div
            style={{
              borderTop: '1px solid #333',
              marginTop: '2mm',
              paddingTop: '1mm',
            }}
          >
            <p style={{ fontSize: '9pt', fontWeight: 'bold', margin: 0 }}>
              {koordinatorDistrik}
            </p>
            <p style={{ fontSize: '8pt', color: '#666', margin: 0 }}>
              Koordinator Distrik
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', width: '35mm' }}>
          {ttdPelatihUrl && (
            <img
              src={ttdPelatihUrl}
              alt="TTD Pelatih"
              style={{ width: '30mm', height: '15mm', objectFit: 'contain' }}
            />
          )}
          <div
            style={{
              borderTop: '1px solid #333',
              marginTop: '2mm',
              paddingTop: '1mm',
            }}
          >
            <p style={{ fontSize: '9pt', fontWeight: 'bold', margin: 0 }}>
              {pelatih}
            </p>
            <p style={{ fontSize: '8pt', color: '#666', margin: 0 }}>
              Pelatih
            </p>
          </div>
        </div>
      </div>

      {/* Cap / Stempel */}
      {capUrl && (
        <div
          style={{
            position: 'absolute',
            bottom: '20mm',
            right: '30mm',
          }}
        >
          <img
            src={capUrl}
            alt="Cap"
            style={{ width: '18mm', height: '18mm', objectFit: 'contain' }}
          />
        </div>
      )}

      {/* Tanggal */}
      <div
        style={{
          position: 'absolute',
          bottom: '15mm',
          left: '30mm',
          right: '30mm',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '9pt', color: '#666', margin: 0 }}>
          {tanggalTandaTangan}
        </p>
      </div>
    </div>
  );
}
