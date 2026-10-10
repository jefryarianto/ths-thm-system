/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildSertifikatTingkatanPdf } from './sertifikat_tingkatan';
import { buildSertifikatPelatihPdf } from './sertifikat_pelatih';
import { buildSertifikatWasitDanJuriPdf } from './sertifikat_wasit_dan_juri';
import { buildSertifikatPengujiPdf } from './sertifikat_penguji';
import { buildPiagamSerojaPdf } from './piagam_seroja';
import { buildPiagamMelatiPdf } from './piagam_melati';
import { buildPiagamMawarPdf } from './piagam_mawar';

/** Kumpulkan semua teks pada pohon elemen react-pdf. */
function collectText(el: any): string {
  if (el == null) return '';
  if (typeof el === 'string' || typeof el === 'number') return String(el);
  let out = '';
  const c = el.props && el.props.children;
  const kids = Array.isArray(c) ? c : [c];
  for (const k of kids) out += ` ${collectText(k)}`;
  return out;
}

const BERLINANG = 'Jakarta, 10 Oktober 2026';

describe('pdf-templates pedoman kesekretariatan (Lampiran 3–6 + Bab VI)', () => {
  it('sertifikat tingkatan memuat nama, nomor, dan frasa LULUS', () => {
    const doc = buildSertifikatTingkatanPdf({
      recipientName: 'Anastasia Kappipang',
      certificateNumber: '03 - 3 - 056',
      previousLevel: 'III (Muda)',
      currentLevel: 'IV (Madya)',
      predikat: 'Baik',
      examDate: '1 Desember 2003',
      examLocation: 'Tanatoraja',
      issuedDate: BERLINANG,
      ranting: 'Ranting Kare',
      districtName: 'Keuskupan Agung Makassar',
      signers: [{ signerName: 'Adrianus Joko', signerTitle: 'Koordinator Nasional' }],
    });
    const text = collectText(doc);
    expect(text).toContain('Anastasia Kappipang');
    expect(text).toContain('03 - 3 - 056');
    expect(text).toContain('LULUS');
  });

  it('sertifikat pelatih memuat nama dan kewenangan pelatih', () => {
    const doc = buildSertifikatPelatihPdf({
      recipientName: 'Fransisca Arliyanti',
      certificateNumber: 'SP-2005-001',
      trainingTitle: 'tingkat Nasional',
      issuedDate: '17 September 2005',
      ranting: 'Ranting Pasar Minggu',
      districtName: 'Keuskupan Agung Jakarta',
      signers: [{ signerName: 'Ignatius Ibi Wekin', signerTitle: 'Koordinator Nasional' }],
    });
    const text = collectText(doc);
    expect(text).toContain('Fransisca Arliyanti');
    expect(text).toContain('Pelatih');
  });

  it('sertifikat wasit dan juri memuat kualifikasi nasional', () => {
    const doc = buildSertifikatWasitDanJuriPdf({
      recipientName: 'Lorensius Eddy Winarto',
      certificateNumber: 'SWJ-2004-001',
      competitionTitle: 'Kejuaraan Nasional',
      issuedDate: BERLINANG,
      ranting: 'Ranting Timika',
      districtName: 'Keuskupan Timika',
      signers: [{ signerName: 'Benedictus Wiharto', signerTitle: 'Dewan Pendiri' }],
    });
    const text = collectText(doc);
    expect(text).toContain('Lorensius Eddy Winarto');
    expect(text).toContain('Wasit dan Juri');
  });

  it('sertifikat penguji memuat jenjang penguji', () => {
    const doc = buildSertifikatPengujiPdf({
      recipientName: 'Antonius B. Situmorang',
      certificateNumber: 'SPG-2005-001',
      examLevel: 'I (Pratama)',
      issuedDate: '17 September 2005',
      ranting: 'Ranting Pematangsiantar',
      districtName: 'Keuskupan Agung Medan',
      signers: [{ signerName: 'R. Adi Satriyo Nugroho', signerTitle: 'Dewan Pendiri' }],
    });
    const text = collectText(doc);
    expect(text).toContain('Antonius B. Situmorang');
    expect(text).toContain('PENGUJI');
  });

  it('piagam seroja memuat nama dan lambang perjuangan', () => {
    const doc = buildPiagamSerojaPdf({
      recipientName: 'Anggota Teladan',
      awardNumber: 'PS-2026-001',
      activityDetail: 'panitia kegiatan tingkat Distrik',
      issuedDate: BERLINANG,
      ranting: 'Ranting Uji',
      districtName: 'Distrik Uji',
      signers: [{ signerName: 'Koordinator X', signerTitle: 'Koordinator Distrik' }],
    });
    const text = collectText(doc);
    expect(text).toContain('Anggota Teladan');
    expect(text).toContain('SEROJA');
  });

  it('piagam melati memuat tingkat dan narasi kesetiaan', () => {
    const doc = buildPiagamMelatiPdf({
      recipientName: 'Yohanes Fenta Narottama',
      awardNumber: 'PM-2006-001',
      melatiLevel: 4,
      issuedDate: '10 Agustus 2006',
      ranting: 'Ranting Buah Batu',
      districtName: 'Keuskupan Bandung',
      signers: [{ signerName: 'A. Bambang Wahyudi', signerTitle: 'Koordinator Nasional' }],
    });
    const text = collectText(doc);
    expect(text).toContain('Yohanes Fenta Narottama');
    expect(text).toContain('MELATI');
  });

  it('piagam mawar memuat nama dan kutipan Ave Maria', () => {
    const doc = buildPiagamMawarPdf({
      recipientName: 'Ibu Maria Sumiyarti Rahadi',
      awardNumber: 'PMW-2004-001',
      contributionDetail: 'pendampingan dan pembinaan',
      issuedDate: '10 Agustus 2004',
      ranting: 'Ranting Uji',
      districtName: 'Keuskupan Agung Jakarta',
      signers: [{ signerName: 'Rm. A.G. Luhur Prihadi, Pr.', signerTitle: 'Dewan Pendiri' }],
    });
    const text = collectText(doc);
    expect(text).toContain('Ibu Maria Sumiyarti Rahadi');
    expect(text).toContain('MAWAR');
  });
});
