import React from 'react';

/**
 * JSX Template Surat Keputusan (SK) A4 Portrait
 * Data yang dibutuhkan:
 * - nomorSurat
 * - perihal
 * - tanggal
 * - dasar
 * - isi (array of string)
 * - penutup
 * - penggunaSatu
 * - penggunaDua
 * - ttdPenggunaSatuUrl
 * - ttdPenggunaDuaUrl
 * - capUrl
 * - logoUrl
 */
export default function SuratKeputusanA4PortraitTemplate({
  nomorSurat = 'SK/THS-THM/2025/001',
  perihal = 'Perihal Surat Keputusan',
  tanggal = 'Tanggal',
  dasar = 'Dasar surat keputusan',
  isi = ['Isi poin 1', 'Isi poin 2', 'Isi poin 3'],
  penutup = 'Demikian surat keputusan ini dibuat untuk dipergunakan sebagaimana mestinya.',
  penggunaSatu = 'Nama Pengguna Satu',
  penggunaDua = 'Nama Pengguna Dua',
  ttdPenggunaSatuUrl = '',
  ttdPenggunaDuaUrl = '',
  capUrl = '',
  logoUrl = '/assets/thsthm.svg',
}) {
  return (
    <div
      style={{
        width: '210mm',
        minHeight: '297mm',
        position: 'relative',
        backgroundColor: '#fff',
        fontFamily: 'Times New Roman, serif',
        padding: '25mm 20mm 20mm 20mm',
        boxSizing: 'border-box',
      }}
    >
      {/* Kop Surat */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '8mm',
        }}
      >
        <img
          src={logoUrl}
          alt="Logo"
          style={{ width: '25mm', height: '25mm', objectFit: 'contain' }}
        />
        <h1
          style={{
            fontSize: '14pt',
            fontWeight: 'bold',
            color: '#1e3a5f',
            margin: '2mm 0',
          }}
        >
          TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA
        </h1>
        <p
          style={{
            fontSize: '11pt',
            color: '#333',
            margin: 0,
          }}
        >
          Organisasi Keumatan
        </p>
        <div
          style={{
            width: '100%',
            height: '2px',
            backgroundColor: '#1e3a5f',
            marginTop: '3mm',
          }}
        />
      </div>

      {/* Judul */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '6mm',
        }}
      >
        <h2
          style={{
            fontSize: '14pt',
            fontWeight: 'bold',
            color: '#1e3a5f',
            margin: 0,
            textDecoration: 'underline',
          }}
        >
          SURAT KEPUTUSAN
        </h2>
        <p
          style={{
            fontSize: '11pt',
            color: '#333',
            margin: '2mm 0 0 0',
          }}
        >
          Nomor: {nomorSurat}
        </p>
      </div>

      {/* Perihal */}
      <div
        style={{
          marginBottom: '5mm',
        }}
      >
        <p style={{ fontSize: '11pt', margin: 0 }}>
          <strong>Perihal:</strong> {perihal}
        </p>
      </div>

      {/* Dasar */}
      {dasar && (
        <div
          style={{
            marginBottom: '4mm',
          }}
        >
          <p style={{ fontSize: '11pt', margin: 0 }}>
            <strong>Dasar:</strong> {dasar}
          </p>
        </div>
      )}

      {/* Isi */}
      <div
        style={{
          marginBottom: '6mm',
        }}
      >
        <p style={{ fontSize: '11pt', fontWeight: 'bold', margin: '0 0 2mm 0' }}>
          Memutuskan:
        </p>
        {isi.map((poin, idx) => (
          <p
            key={idx}
            style={{
              fontSize: '11pt',
              margin: '1mm 0',
              paddingLeft: '8mm',
              textIndent: '-8mm',
            }}
          >
            {idx + 1}. {poin}
          </p>
        ))}
      </div>

      {/* Penutup */}
      <div
        style={{
          marginBottom: '10mm',
        }}
      >
        <p style={{ fontSize: '11pt', margin: 0, textAlign: 'justify' }}>
          {penutup}
        </p>
      </div>

      {/* Tanda Tangan */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '6mm',
        }}
      >
        <div style={{ textAlign: 'center', width: '40mm' }}>
          {ttdPenggunaSatuUrl && (
            <img
              src={ttdPenggunaSatuUrl}
              alt="TTD"
              style={{ width: '35mm', height: '18mm', objectFit: 'contain' }}
            />
          )}
          <div
            style={{
              borderTop: '1px solid #333',
              marginTop: '2mm',
              paddingTop: '1mm',
            }}
          >
            <p style={{ fontSize: '10pt', fontWeight: 'bold', margin: 0 }}>
              {penggunaSatu}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', width: '40mm' }}>
          {ttdPenggunaDuaUrl && (
            <img
              src={ttdPenggunaDuaUrl}
              alt="TTD"
              style={{ width: '35mm', height: '18mm', objectFit: 'contain' }}
            />
          )}
          <div
            style={{
              borderTop: '1px solid #333',
              marginTop: '2mm',
              paddingTop: '1mm',
            }}
          >
            <p style={{ fontSize: '10pt', fontWeight: 'bold', margin: 0 }}>
              {penggunaDua}
            </p>
          </div>
        </div>
      </div>

      {/* Tempat & Tanggal */}
      <div
        style={{
          textAlign: 'right',
          fontSize: '10pt',
          color: '#666',
          marginTop: '4mm',
        }}
      >
        {tanggal}
      </div>

      {/* Cap / Stempel */}
      {capUrl && (
        <div
          style={{
            position: 'absolute',
            bottom: '20mm',
            right: '20mm',
          }}
        >
          <img
            src={capUrl}
            alt="Cap"
            style={{ width: '20mm', height: '20mm', objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  );
}
