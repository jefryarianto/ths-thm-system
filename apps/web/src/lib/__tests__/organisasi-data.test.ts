import { describe, it, expect } from 'vitest';
import {
  STATUTA_INFO,
  JANJI_PRASETYA_DATA,
  TIGA_PILAR_DATA,
  STRUKTUR_HIERARKI_DATA,
  DEWAN_PENDIRI_DATA,
  KATEGORI_USIA_DATA,
  JENJANG_SABUK_DATA,
  MAKNA_LAMBANG_DATA,
} from '../../../app/organisasi/organisasi-data';

describe('THS-THM Official Statuta 2023 Data Constants', () => {
  it('contains correct basic metadata from TAP 02/THS-THM/2023', () => {
    expect(STATUTA_INFO.nomorTap).toContain('TAP 02 / THS-THM / 2023');
    expect(STATUTA_INFO.guruBesar).toContain('Yesus Kristus');
    expect(STATUTA_INFO.semboyan).toBe('Pro Patria et Ecclesia');
    expect(STATUTA_INFO.motto).toBe('Fortiter in Re, Suaviter in Modo');
  });

  it('contains authentic 5 Butir Janji Prasetya', () => {
    expect(JANJI_PRASETYA_DATA.butir).toHaveLength(5);
    expect(JANJI_PRASETYA_DATA.butir[0].text).toContain('rendah hati');
    expect(JANJI_PRASETYA_DATA.butir[1].text).toContain('nama baik organisasi');
    expect(JANJI_PRASETYA_DATA.butir[2].text).toContain('Gereja Katolik Roma');
    expect(JANJI_PRASETYA_DATA.butir[3].text).toContain('orangtua');
    expect(JANJI_PRASETYA_DATA.butir[4].text).toContain('Pancasila');
  });

  it('contains the 3 pillars of character formation (3S)', () => {
    expect(TIGA_PILAR_DATA).toHaveLength(3);
    const ids = TIGA_PILAR_DATA.map((p) => p.id);
    expect(ids).toContain('spiritualitas');
    expect(ids).toContain('beladiri');
    expect(ids).toContain('organisasi');
  });

  it('contains 16 official Dewan Pendiri figures from Statuta', () => {
    expect(DEWAN_PENDIRI_DATA).toHaveLength(16);
    expect(DEWAN_PENDIRI_DATA[0].nama).toBe('RD. Martinus Hadiwijoyo');
    expect(DEWAN_PENDIRI_DATA[3].nama).toBe('Dra. Margriet Emmy Putraningrum, M.Psi');
  });

  it('contains complete 5 hierarchical governance levels', () => {
    expect(STRUKTUR_HIERARKI_DATA).toHaveLength(5);
    const levels = STRUKTUR_HIERARKI_DATA.map((s) => s.level);
    expect(levels).toEqual(['Nasional', 'Distrik', 'Wilayah', 'Ranting', 'Unit Latihan / Basis']);
  });

  it('contains 4 membership age categories', () => {
    expect(KATEGORI_USIA_DATA).toHaveLength(4);
    const names = KATEGORI_USIA_DATA.map((k) => k.kategori);
    expect(names).toContain('Pra-Bina');
    expect(names).toContain('Anggota Subjek Bina');
    expect(names).toContain('Anggota Medior');
    expect(names).toContain('Anggota Senior');
  });

  it('contains belt ranks and THS-THM logo symbolism', () => {
    expect(JENJANG_SABUK_DATA.length).toBeGreaterThanOrEqual(6);
    expect(MAKNA_LAMBANG_DATA.ths.nama).toContain('Tunggal Hati Seminari');
    expect(MAKNA_LAMBANG_DATA.thm.nama).toContain('Tunggal Hati Maria');
  });
});
