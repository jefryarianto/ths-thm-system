import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Animated,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Rect, Defs, Pattern, LinearGradient, Stop } from 'react-native-svg';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView, ErrorView } from '../../components/ui/shared';
import { useRefresh } from '../../hooks/use-refresh';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// Logo resmi THS-THM (di-bundle bersama app)
const LOGO = require('../../../assets/images/logo.png');

// Siluet fallback foto anggota — path dari man-icon.svg / woman-icon.svg (root repo)
// dirender via react-native-svg dengan satu warna agar bisa di-tint sesuai kartu.
const MAN_PATHS = [
  'M318.647 319.401c17.395 38.715 58.464 45.55 93.095 52.245C462.398 381.432 512 429.266 512 483.478v22.094c0 3.725-3.04 6.765-6.775 6.765H6.775c-3.735 0-6.775-3.04-6.775-6.765v-19.988c0-65.14 52.682-103.616 105.911-110.739 38.724-5.175 70.951-10.431 84.581-57.241 3.527 3.089 7.233 6.208 11.008 9.566 35.277 31.363 75.025 32.724 109.01-.049 2.792-2.703 5.524-5.246 8.137-7.72z',
  'M318.647 319.411c9.1 20.247 24.677 31.781 42.409 39.122-59.984 44.01-142.797 41.466-204.49 3.855 18.687-10.064 28.045-24.638 33.907-44.795 3.526 3.09 7.242 6.21 11.027 9.577 35.277 31.363 75.025 32.724 109.01-.049 2.792-2.703 5.524-5.246 8.137-7.71z',
  'M259.328 391.058c-35.873.159-71.955-9.895-102.762-28.67 18.617-10.024 28.214-24.826 33.916-44.795 3.537 3.09 7.233 6.21 11.018 9.577 18.528 16.472 38.307 24.667 57.828 23.992v39.896z',
  'M134.739 212.161c4.655-13.324 15.482-9.04 30.904-3.412l-.142-.666.142.075c11.004-115.475 85.398-49.193 141.122-109.957 29.279 14.418 48.212 43.104 43.366 107.067l.156-.124a280.937 280.937 0 01-1.534 10.001c14.023-10.621 34.241-9.633 27.882 13.905l-8.687 24.605c-2.077 5.889-3.466 8.027-10.91 7.627-3.288-.175-6.595-1.443-9.894-3.622 3.046 36.31-14.579 48.157-36.64 69.449-33.977 32.787-73.728 31.433-108.995.059-20.658-18.375-39.004-29.534-39.92-67.307-5.356 1.641-10.42 1.939-14.842-.575-8.814-5.016-12.024-19.614-12.505-28.962-.193-3.759-.032-14.335.497-18.163z',
  'M134.741 212.161c4.66-13.326 15.477-9.036 30.903-3.411l-.138-.665.138.075c8.039-84.405 49.947-71.713 93.68-82.493V351.16c-19.515.683-39.287-7.506-57.817-23.992-20.657-18.374-39.005-29.529-39.914-67.305-5.356 1.637-10.422 1.937-14.843-.577-12.837-7.306-13.871-33.724-12.009-47.125z',
  'M108.075 92.791C176.124 8.703 254.558-37.032 313.452 37.772c72.174 3.79 97.211 121.553 36.678 167.497 4.849-63.963-14.086-92.651-43.364-107.067-55.725 60.764-130.12-5.52-141.122 109.955l-26.707-13.909c-2.652-33.119 5.106-90.577-30.862-101.457z',
];
const WOMAN_PATHS = [
  'M60.185 311.499c44.657-3.627 61.073-50.023 66.576-98.131 8.382-73.65-3.246-168.407 85.39-204.232 70.384-28.465 161.399 9.853 171.327 111.254-.415 68.908 18.965 186.102 80.637 191.109-4.236 11.921-23.139 20.259-46.403 23.906 74.922 23.887 97.119 64.908 94.007 154.147H256l77.601-90.944 72.102 25.025-47.386-89.159c-13.764-2.718-26.195-7.333-35.245-14.077l-1.776-.632c-3.007 34.963-38.459 103.38-65.296 159.386-26.323-54.934-60.931-121.807-65.084-157.338-10.327 8.768-24.322 14.117-39.343 16.63l-45.277 85.19 72.102-25.025L256 489.552H.28c-3.173-91.056 20.084-129.853 95.428-153.824-17.795-4.835-31.662-13.352-35.523-24.229zm257.466 4.179c-5.371-5.518-8.773-12.152-9.446-19.994-14.465 9.406-31.173 15.249-49.684 15.861-18.054.594-36.251-3.87-52.024-14.003-1.858 6.954-5.109 12.943-9.401 18.067 23.326 43.258 98.141 41.441 120.555.069zm-.739-42.603c39.176-43.33 45.124-86.94 33.96-142.596-26.935-12.485-44.551-39.925-53.575-81.156-10.783 78.494-107.18 75.126-131.422 89.407 0 48.262-2.907 97.87 32.652 136.216 32.391 34.925 87.77 30.551 118.385-1.871z',
];

/** Siluet fallback foto — dirender dari path ikon man/woman dengan warna seragam. */
function PhotoSilhouette({ female }: { female: boolean }) {
  const paths = female ? WOMAN_PATHS : MAN_PATHS;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 512 512" preserveAspectRatio="xMidYMid meet">
      {paths.map((d, i) => (
        <Path key={i} d={d} fill="#94a3b8" />
      ))}
    </Svg>
  );
}

// Ukuran desain kartu (CR80 landscape) — seluruh layout memakai koordinat 856×540
const CARD_W = 856;
const CARD_H = 540;

// Font nomor anggota — OCR A Extended (didaftarkan via plugin expo-font di app.json)
// Nama font harus SAMA PERSIS dgn nama family internal file TTF: "OCR A Extended"
// (cek metadata TTF via System.Drawing/FontBook; nama family = "OCR A Extended", ada spasi)
const OCR_A_FONT = 'OCR A Extended';

// ─── Watermark peta Indonesia — ilustrasi titik halftone (vecteezy) ───
// File SVG asli (4.092 titik merah, 1.6MB) dirasterisasi ke PNG putih-transparan
// 1200×414 (~34KB) agar ringan di-bundle — titik-putih bisa di-tint via tintColor.
const MAP_DOTS = require('../../../assets/images/map-indonesia-dots.png');

/** Watermark peta Indonesia (PNG titik halftone, tintColor = warna titik). */
function IndonesiaMapWatermark({ color, opacity, size = { width: 420, height: 145 } }: { color: string; opacity: number; size?: { width: number; height: number } }) {
  return (
    <Image source={MAP_DOTS} style={{ width: size.width, height: size.height, opacity, tintColor: color }} resizeMode="contain" />
  );
}

/** Latar abstrak — pita melengkung dengan gradien biru yang saling tumpang tindih
 *  (bukan blok warna solid), nuansa referensi "abstract wavy background". */
function WavyBackground() {
  return (
    <Svg width={CARD_W} height={CARD_H} viewBox="0 0 856 540" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="w1" x1="0" y1="0" x2="0.6" y2="1">
          <Stop offset="0" stopColor="#bfdbfe" stopOpacity={0.9} />
          <Stop offset="1" stopColor="#e0f2fe" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="w2" x1="1" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor="#93c5fd" stopOpacity={0.6} />
          <Stop offset="1" stopColor="#eff6ff" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="w3" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#7dd3fc" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#f0f9ff" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d="M-60 110 C 140 30, 320 200, 500 110 S 780 20, 916 100 L 916 560 L -60 560 Z" fill="url(#w1)" />
      <Path d="M-40 300 C 180 200, 380 380, 560 300 S 780 220, 900 290 L 900 560 L -40 560 Z" fill="url(#w2)" />
      <Path d="M-60 440 C 150 350, 340 530, 540 440 S 790 370, 916 440 L 916 560 L -60 560 Z" fill="url(#w3)" />
    </Svg>
  );
}

/** Header abstrak — bentuk melengkung mengalir dengan gradien biru 45° (bukan blok solid),
 *  memberi kontras untuk teks header putih. Tepi bawah bergelombang, bukan garis lurus. */
function AbstractHeader() {
  return (
    <Svg width={CARD_W} height={CARD_H} viewBox="0 0 856 540" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="headGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2563eb" />
          <Stop offset="1" stopColor="#1d4ed8" />
        </LinearGradient>
      </Defs>
      <Path
        d="M0 0 H856 V96 C 730 118 660 88 570 110 C 470 136 380 92 290 116 C 200 140 96 104 0 124 Z"
        fill="url(#headGrad)"
      />
    </Svg>
  );
}

/** Gradien biru bawah — sudut 45° (arah berlawanan), cukup terang agar
 *  teks hitam penandatangan & masa berlaku tetap terbaca. */
function BottomGradient() {
  return (
    <Svg width={CARD_W} height={CARD_H} viewBox="0 0 856 540" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="botGrad" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#93c5fd" stopOpacity={0.8} />
          <Stop offset="1" stopColor="#dbeafe" stopOpacity={0.2} />
        </LinearGradient>
      </Defs>
      <Path
        d="M0 462 C 140 436, 300 476, 470 450 S 720 424, 856 452 L 856 540 L 0 540 Z"
        fill="url(#botGrad)"
      />
    </Svg>
  );
}

/** Latar belakang kartu belakang — gradien abstrak (bukan blok warna solid). */
function BackGradient() {
  return (
    <Svg width={CARD_W} height={CARD_H} viewBox="0 0 856 540" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="backGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2563eb" />
          <Stop offset="0.5" stopColor="#1e40af" />
          <Stop offset="1" stopColor="#0f2b4a" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={CARD_W} height={CARD_H} fill="url(#backGrad)" />
      <Path d="M-40 170 C 160 90, 340 240, 520 170 S 780 90, 920 170 L 920 540 L -40 540 Z" fill="#ffffff" opacity={0.06} />
    </Svg>
  );
}

/** Guilloche / microprint border — garis sinusoidal tipis mengelilingi kartu.
 *  Memakai beberapa rect berlapis (strokeDasharray) yang andal di react-native-svg,
 *  plus pattern sinusoidal halus sebagai dekorasi tambahan. */
function GuillocheBorder({ patternId, strokeColor }: { patternId: string; strokeColor: string }) {
  return (
    <Svg width={CARD_W} height={CARD_H} viewBox="0 0 856 540" style={styles.guilloche}>
      <Defs>
        <Pattern id={patternId} x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
          <Path d="M0 9 Q4.5 0 9 9 T18 9" fill="none" stroke={strokeColor} strokeWidth={0.5} />
        </Pattern>
      </Defs>
      <Rect x={16} y={16} width={824} height={508} rx={22} fill="none" stroke={strokeColor} strokeWidth={1.2} opacity={0.45} />
      <Rect x={22} y={22} width={812} height={496} rx={18} fill="none" stroke={strokeColor} strokeWidth={0.8} strokeDasharray="3 5" opacity={0.35} />
      <Rect x={27} y={27} width={802} height={486} rx={14} fill="none" stroke={strokeColor} strokeWidth={0.5} opacity={0.2} />
      <Rect x={16} y={16} width={824} height={508} rx={22} fill="none" stroke={`url(#${patternId})`} strokeWidth={14} opacity={0.5} />
    </Svg>
  );
}

/** Hologram / foil shimmer overlay (gradient diagonal) — Svg + LinearGradient + Rect. */
function ShimmerOverlay({
  id,
  width,
  height,
  colors,
  borderRadius = 0,
}: {
  id: string;
  width: number;
  height: number;
  colors: [string, string, string];
  borderRadius?: number;
}) {
  return (
    <Svg width={width} height={height} style={styles.shimmerOverlay}>
      <Defs>
        <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colors[0]} />
          <Stop offset="50%" stopColor={colors[1]} />
          <Stop offset="100%" stopColor={colors[2]} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} rx={borderRadius} fill={`url(#${id})`} />
    </Svg>
  );
}

// ─── Types ───

interface MemberInfo {
  id: string;
  nomorAnggota: string;
  namaLengkap: string;
  tingkat: string | null;
  jenisKelamin: string | null;
  statusKeanggotaan: string;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  tempatDadar: string | null;
  tahunDadar: string | null;
  fotoPath: string | null;
  ranting?: {
    nama: string;
    wilayah?: { nama: string; distrik?: { nama: string } };
  } | null;
}

interface CardData {
  qrCode: string | null;
  signerName: string;
  signerTitle: string;
  /** Penandatangan ganda (1-3) dari API — tampil berurutan. */
  signers?: { signerName?: string; signerTitle?: string }[];
  levelVisual?: { stripCount: number; color: string; label?: string } | null;
  /** Gambar tanda tangan & stempel asli (dari pengaturan) — URL path /api/uploads/... */
  signatureImage?: string | null;
  stampImage?: string | null;
}

// ─── Tingkat → visual balok (sesuai tabel pengaturan tingkatan) ───

const TINGKAT_LEVEL: Record<string, { stripCount: number; color: string; label: string }> = {
  Anggota: { stripCount: 0, color: '#94a3b8', label: 'Tanpa strip' },
  Pratama: { stripCount: 1, color: '#1d4ed8', label: 'Biru 1' },
  Tamtama: { stripCount: 2, color: '#1d4ed8', label: 'Biru 2' },
  Muda:    { stripCount: 1, color: '#ca8a04', label: 'Kuning 1' },
  Madya:   { stripCount: 2, color: '#ca8a04', label: 'Kuning 2' },
  Utama:   { stripCount: 3, color: '#ca8a04', label: 'Kuning 3' },
};

function getLevelVisual(
  tingkat?: string | null,
  fromApi?: { stripCount: number; color: string; label?: string } | null,
) {
  if (fromApi) return fromApi;
  return (tingkat && TINGKAT_LEVEL[tingkat]) || { stripCount: 0, color: '#94a3b8', label: 'Tanpa strip' };
}

// ─── Card shell (scaling 856×540 → lebar layar) ───

function CardShell({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  const { width } = useWindowDimensions();
  const scale = Math.min(width - 32, CARD_W) / CARD_W;

  return (
    <View style={{ width: CARD_W * scale, height: CARD_H * scale, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 }}>
      <View
        style={[
          styles.cardCanvas,
          dark ? styles.cardBack : styles.cardFront,
          { transform: [{ scale }], transformOrigin: 'top left' },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

// ─── Helpers tampilan ───

function InfoRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      {/* Kolom titik dua dengan lebar tetap → semua baris sejajar */}
      <Text style={styles.infoColon}>:</Text>
      <Text style={[styles.infoValue, strong && styles.infoValueStrong]} numberOfLines={strong ? 2 : 1}>
        {value}
      </Text>
    </View>
  );
}

function BackRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.backRow}>
      <Text style={styles.backRowLabel}>{label}</Text>
      {/* Kolom titik dua dengan lebar tetap → semua baris sejajar */}
      <Text style={styles.backColon}>:</Text>
      <Text style={styles.backRowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── Sisi Depan ───

function MemberCardFront({ member, cardData, validUntilText }: { member: MemberInfo | null; cardData: CardData | null; validUntilText: string }) {
  const lv = getLevelVisual(member?.tingkat, cardData?.levelVisual || null);
  const distrik = member?.ranting?.wilayah?.distrik?.nama || 'THS-THM';

  return (
    <CardShell>
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* Latar abstrak — gradien & lengkung, bukan blok warna */}
      <WavyBackground />

      {/* Header abstrak — gradien biru 45° untuk kontras teks putih */}
      <AbstractHeader />

      {/* Gradien biru bawah — sudut 45° (terang, teks hitam tetap terbaca) */}
      <BottomGradient />

      {/* Guilloche / microprint border */}
      <GuillocheBorder patternId="g-front" strokeColor="rgba(29,78,216,0.3)" />

      {/* Watermark — siluet peta titik halftone di tengah, jelas terlihat */}
      <View style={styles.watermarkWrap} pointerEvents="none">
        <IndonesiaMapWatermark color="#1d4ed8" opacity={0.55} size={{ width: 480, height: 166 }} />
      </View>

      <View style={styles.content}>
        {/* Header — 4 baris + logo */}
        <View style={styles.headerRow}>
          <View style={styles.logo}>
            <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
            {/* Hologram / foil shimmer overlay */}
            <ShimmerOverlay id="logoShimmer" width={64} height={64} colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']} borderRadius={32} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.row1} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>KARTU TANDA ANGGOTA</Text>
            <Text style={styles.row2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>ORGANISASI PENCAK SILAT PENDIDIKAN</Text>
            <Text style={styles.orgName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA</Text>
            {/* distrik bisa berisi "Keuskupan X" — hindari duplikasi "DISTRIK KEUSKUPAN KEUSKUPAN X" */}
            <Text style={styles.distrikName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              DISTRIK KEUSKUPAN {distrik.replace(/^keuskupan\s*/i, '').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Photo — fallback siluet sesuai jenis kelamin bila tanpa foto */}
        <View style={styles.photoBox}>
          {member?.fotoPath ? (
            <Image source={{ uri: `${API_URL}/api/uploads/${encodeURIComponent(member.fotoPath)}` }} style={styles.photoImg} resizeMode="cover" />
          ) : (
            <PhotoSilhouette female={member?.jenisKelamin === 'P'} />
          )}
        </View>

        {/* Level strips — berjarak dari bingkai foto (photo bottom = 165+235 = 400) */}
        <View style={styles.stripsBox}>
          {Array.from({ length: lv.stripCount }).map((_, i) => (
            <View key={i} style={[styles.strip, { backgroundColor: lv.color }]} />
          ))}
        </View>

        {/* Info — No. Anggota, Nama, Tempat/Tanggal Lahir, Ranting, Wilayah — semua UPPERCASE (Distrik sudah ada di header) */}
        <View style={styles.infoBox}>
          <InfoRow label="No. Anggota" value={(member?.nomorAnggota || '-').toUpperCase()} strong />
          <InfoRow label="Nama" value={(member?.namaLengkap || '-').toUpperCase()} />
          <InfoRow label="Tempat Lahir" value={(member?.tempatLahir || '-').toUpperCase()} />
          <InfoRow
            label="Tanggal Lahir"
            value={(member?.tanggalLahir
              ? new Date(member.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
              : '-')
              .toUpperCase()}
          />
          <InfoRow label="Ranting" value={(member?.ranting?.nama || '-').toUpperCase()} />
          <InfoRow label="Wilayah" value={(member?.ranting?.wilayah?.nama || '-').toUpperCase()} />
        </View>

        {/* Bottom */}
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomLabel}>Berlaku sampai</Text>
          <Text style={styles.bottomValue}>{validUntilText}</Text>
        </View>

        {/* Signer */}
        <View style={styles.signerBox}>
          <View style={styles.sigWrap}>
            {/* Hologram / foil shimmer overlay */}
            <ShimmerOverlay id="sigShimmer" width={192} height={80} colors={['rgba(34,211,238,0.25)', 'rgba(255,255,255,0.35)', 'rgba(252,211,77,0.25)']} borderRadius={12} />
            {cardData?.signatureImage ? (
              <Image source={{ uri: `${API_URL}/api/uploads/${encodeURIComponent(cardData.signatureImage)}` }} style={styles.sigImg} resizeMode="contain" />
            ) : (
              <Text style={styles.sig}>ttd</Text>
            )}
            {cardData?.stampImage ? (
              <View style={styles.stamp}>
                <Image source={{ uri: `${API_URL}/api/uploads/${encodeURIComponent(cardData.stampImage)}` }} style={styles.stampImg} resizeMode="contain" />
              </View>
            ) : (
              <View style={styles.stamp}>
                <Text style={styles.stampText}>STEMPEL</Text>
              </View>
            )}
          </View>
          {(cardData?.signers && cardData.signers.length > 0
            ? cardData.signers
            : [{ signerName: cardData?.signerName || 'Koordinator Distrik', signerTitle: cardData?.signerTitle || 'THS-THM' }]
          ).map((s, i) => (
            <View key={i} style={styles.signerRow}>
              <Text style={styles.signerName} numberOfLines={1}>{(s.signerName || 'Koordinator Distrik').toUpperCase()}</Text>
              <Text style={styles.signerTitle} numberOfLines={1}>{(s.signerTitle || '').toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </View>
    </CardShell>
  );
}

// ─── Sisi Belakang ───

function MemberCardBack({ member, cardData, ttl, dadar, validUntilText }: { member: MemberInfo | null; cardData: CardData | null; ttl: string; dadar: string; validUntilText: string }) {
  return (
    <CardShell dark>
      {/* Latar abstrak gradien — bukan blok warna solid */}
      <BackGradient />

      {/* Guilloche / microprint border */}
      <GuillocheBorder patternId="g-back" strokeColor="rgba(191,219,254,0.4)" />

      {/* Watermark — siluet peta titik halftone PUTIH di tengah, jelas terlihat */}
      <View style={styles.backWatermarkWrap} pointerEvents="none">
        <IndonesiaMapWatermark color="#ffffff" opacity={0.65} size={{ width: 480, height: 166 }} />
      </View>

      <View style={styles.content}>
        {/* Title */}
        <View style={styles.backTitleBox}>
          <Text style={styles.backTitle}>VERIFIKASI KARTU ANGGOTA</Text>
          <Text style={styles.backSubtitle}>Scan QR untuk memeriksa keabsahan anggota</Text>
        </View>

        {/* QR */}
        <View style={styles.qrBox}>
          {cardData?.qrCode ? (
            <Image source={{ uri: cardData.qrCode }} style={styles.qrImg} resizeMode="contain" />
          ) : (
            <Text style={styles.qrPlaceholder}>QR</Text>
          )}
        </View>

        {/* Info */}
        <View style={styles.backInfoBox}>
          <Text style={styles.backDesc}>
            Halaman verifikasi publik hanya menampilkan data minimum untuk membuktikan keabsahan anggota.
          </Text>
          <BackRow label="TTL" value={ttl.toUpperCase()} />
          <BackRow label="DADAR" value={dadar.toUpperCase()} />
          <BackRow label="Status" value={member?.statusKeanggotaan === 'aktif' ? 'AKTIF' : 'NONAKTIF'} />
          <BackRow label="Valid s/d" value={validUntilText} />
        </View>

        {/* Footer */}
        <View style={styles.backFooter}>
          <Text style={styles.footerText}>
            Jika kartu ini ditemukan, harap menghubungi sekretariat THS-THM setempat.
          </Text>
          <View style={styles.footerUrl}>
            <Text style={styles.footerUrlLabel}>URL Verifikasi</Text>
            <Text style={styles.footerUrlValue}>/verify/member/token</Text>
          </View>
        </View>
      </View>
    </CardShell>
  );
}

// ─── Kartu flip: depan saja, ketuk untuk membalik ke belakang ───

function FlipCard({
  member,
  cardData,
  ttl,
  dadar,
  validUntilText,
}: {
  member: MemberInfo | null;
  cardData: CardData | null;
  ttl: string;
  dadar: string;
  validUntilText: string;
}) {
  const { width } = useWindowDimensions();
  const scale = Math.min(width - 32, CARD_W) / CARD_W;
  const cardW = CARD_W * scale;
  const cardH = CARD_H * scale;

  const [flipped, setFlipped] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const flip = () => {
    setFlipped((prev) => !prev);
    Animated.spring(anim, {
      toValue: flipped ? 0 : 1,
      friction: 9,
      tension: 12,
      useNativeDriver: true,
    }).start();
  };

  const frontRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  return (
    <Pressable onPress={flip} style={{ width: cardW, height: cardH }} accessibilityRole="button" accessibilityLabel={flipped ? 'Tampilkan sisi depan kartu' : 'Tampilkan sisi belakang kartu'}>
      <Animated.View
        style={[
          styles.flipFace,
          { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] },
        ]}
        pointerEvents="none"
      >
        <MemberCardFront member={member} cardData={cardData} validUntilText={validUntilText} />
      </Animated.View>
      <Animated.View
        style={[
          styles.flipFace,
          { transform: [{ perspective: 1000 }, { rotateY: backRotate }] },
        ]}
        pointerEvents="none"
      >
        <MemberCardBack member={member} cardData={cardData} ttl={ttl} dadar={dadar} validUntilText={validUntilText} />
      </Animated.View>
    </Pressable>
  );
}

// ─── Screen ───

export default function DigitalCardScreen() {
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      // Profil anggota milik user yang login (self-scope)
      const me = unwrap<MemberInfo | null>(await apiClient.get('/members/me'));
      setMember(me);
      if (me?.id) {
        try {
          const res = await apiClient.get(`/members/${me.id}/digital-card`);
          const data = unwrap<{
            qrCode: string;
            levelVisual?: { stripCount: number; color: string; label?: string } | null;
            signatureImage?: string | null;
            stampImage?: string | null;
            card?: { signerName?: string; signerTitle?: string; signers?: { signerName?: string; signerTitle?: string }[] };
          }>(res);
          setCardData({
            qrCode: data.qrCode || null,
            signerName: data.card?.signerName || 'Koordinator Distrik',
            signerTitle: data.card?.signerTitle || 'THS-THM',
            signers: data.card?.signers || [],
            levelVisual: data.levelVisual || null,
            signatureImage: data.signatureImage || null,
            stampImage: data.stampImage || null,
          });
        } catch {
          // QR/signer gagal dimuat — kartu tetap tampil (fallback nama default)
          setCardData({ qrCode: null, signerName: 'Koordinator Distrik', signerTitle: 'THS-THM', signers: [], levelVisual: null });
        }
      } else {
        // User login tidak punya record anggota (email akun ≠ email anggota) → kartu tidak bisa diisi
        setCardData(null);
        setError(
          'Data anggota Anda tidak ditemukan di sistem. Kemungkinan email akun belum terhubung dengan data anggota — perbarui email anggota di web admin (Anggota → Edit → Email) atau hubungi pengurus.',
        );
      }
    } catch (err) {
      setMember(null);
      setCardData(null);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        // Akun login tidak terhubung ke record anggota mana pun
        setError(
          'Data anggota Anda tidak ditemukan di sistem. Pastikan email akun sudah terhubung dengan data anggota — perbarui email di web admin (Anggota → Edit → Email) atau hubungi pengurus.',
        );
      } else {
        setError('Gagal mengambil data kartu. Periksa koneksi internet Anda lalu coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { refreshing, onRefresh } = useRefresh(load);

  if (loading) return <LoadingView />;

  // Error saat data anggota gagal dimuat → tampilkan pesan jelas + tombol coba lagi
  // (daripada kartu kosong diam-diam yang tampak seperti "data belum sinkron").
  if (error && !member) {
    return <ErrorView message={error} onRetry={load} />;
  }

  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 5);
  const validUntilText = validUntil.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const ttl = [member?.tempatLahir, member?.tanggalLahir ? new Date(member.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null]
    .filter(Boolean)
    .join(', ') || '-';
  const dadar = [member?.tempatDadar, member?.tahunDadar].filter(Boolean).join(', ') || '-';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.containerContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.pageTitle}>Kartu Anggota Digital (KTA)</Text>

      <FlipCard member={member} cardData={cardData} ttl={ttl} dadar={dadar} validUntilText={validUntilText} />
      <Text style={styles.flipHint}>👆 Ketuk kartu untuk melihat sisi belakang (QR verifikasi)</Text>

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          Kartu digital ini menggunakan format CR80 landscape (856×540 px) dengan QR Code untuk verifikasi keaslian. Scan QR untuk memvalidasi data anggota.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───
// Layout memakai koordinat kanvas 856×540 (CardShell yang menangani scaling).

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  containerContent: { padding: 16, paddingBottom: 40, alignItems: 'center' },
  pageTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4, alignSelf: 'flex-start' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginTop: 20, marginBottom: 10, alignSelf: 'flex-start' },
  flipFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    backfaceVisibility: 'hidden',
  },
  flipHint: { fontSize: 12, color: '#6b7280', marginTop: 10, alignSelf: 'flex-start' },

  // ── Canvas kartu 856×540 (di-scale oleh CardShell) ──
  cardCanvas: { width: CARD_W, height: CARD_H, borderRadius: 28, overflow: 'hidden' },
  // Background biru-cyan muda sesuai referensi "abstract wavy background"
  cardFront: { backgroundColor: '#f7fcff', borderWidth: 1, borderColor: '#dbeafe' },
  cardBack: { backgroundColor: '#1e40af', borderWidth: 1, borderColor: '#1e3a5f' },

  bgCircle1: { position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(6,182,212,0.15)' },
  bgCircle2: { position: 'absolute', bottom: -110, left: -80, width: 380, height: 380, borderRadius: 190, backgroundColor: 'rgba(29,78,216,0.08)' },

  guilloche: { position: 'absolute', top: 0, left: 0 },
  shimmerOverlay: { position: 'absolute', top: 0, left: 0 },

  watermarkWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', opacity: 1 },
  watermarkLogo: { width: 260, height: 260 },
  backWatermarkWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', opacity: 1 },
  backWatermarkLogo: { width: 260, height: 260 },
  watermarkText: { fontSize: 48, fontWeight: '900', color: '#1e3a5f' },

  content: { ...StyleSheet.absoluteFillObject, zIndex: 10 },

  // ── Header — 4 baris, seluruhnya muat di dalam bar biru (height 104) ──
  // Blok teks: 19+15+22+16+3(margin) = 75px + padding vertikal 28 = 103 ≤ 104 → tidak ada overflow
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 14, paddingBottom: 14, paddingHorizontal: 24 },
  logo: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.95)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3, borderWidth: 2, borderColor: '#ffffff' },
  logoImg: { width: 60, height: 60, alignSelf: 'center' },
  logoInner: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 10, fontWeight: '900', color: '#171717' },
  headerText: { flex: 1 },
  // Semua baris header ukuran sama (16px) & di-bold — tinggi blok 4×20 = 80 + padding 28 = 108 ≤ 110
  row1: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 2, lineHeight: 19 },
  row2: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 1.1, marginTop: 1, lineHeight: 19 },
  orgName: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 0.5, marginTop: 1, lineHeight: 19 },
  distrikName: { fontSize: 16, fontWeight: '900', color: '#fff', marginTop: 1, lineHeight: 19 },

  // ── Photo ──
  photoBox: {
    position: 'absolute', left: 40, top: 165, width: 185, height: 235,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    borderWidth: 4,
    borderColor: '#fff',
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: { fontSize: 18, fontWeight: '700', color: '#94a3b8' },
  photoSilhouette: { width: 130, height: 170, opacity: 0.9 },

  // ── Level strips ── berjarak 12px dari bingkai foto (photo bottom = 165+235 = 400)
  stripsBox: { position: 'absolute', left: 40, top: 412, width: 185, flexDirection: 'column', gap: 6 },
  strip: { height: 14, width: '100%', borderRadius: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)' },

  // ── Info ──
  infoBox: { position: 'absolute', left: 255, top: 162, right: 40 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  infoLabel: { width: 150, fontSize: 18, fontWeight: '700', color: '#1e3a5f', textTransform: 'uppercase' },
  infoColon: { width: 18, fontSize: 18, fontWeight: '700', color: '#111827' },
  infoValue: { flex: 1, fontSize: 18, fontWeight: '600', color: '#111827' },
  // Nomor Anggota: pakai font OCR A Extended (di-bold via simulasi shadow kuat,
  // karena varian asli font OCR A Extended hanya tersedia weight regular;
  // fontWeight di React Native dengan fontFamily custom berisiko fallback ke font sistem)
  infoValueStrong: {
    fontSize: 23,
    fontFamily: OCR_A_FONT,
    color: '#0f2b4a',
    letterSpacing: 1.5,
    textShadowColor: '#0f2b4a',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 0 },
  },

  // ── Bottom ── masa berlaku: proper case, diperkecil mengikuti ukuran nama penandatangan (16px)
  bottomInfo: { position: 'absolute', left: 40, bottom: 40 },
  bottomLabel: { fontSize: 13, fontWeight: '700', color: '#1e3a5f', marginBottom: 2 },
  bottomValue: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 2 },

  // ── Signer ── nama penandatangan + jabatan, warna hitam di atas bar putih
  signerBox: { position: 'absolute', right: 48, bottom: 36, alignItems: 'center' },
  sigWrap: { position: 'relative', width: 192, height: 80, marginBottom: 4 },
  sig: { position: 'absolute', left: 32, top: 0, fontSize: 38, fontStyle: 'italic', color: '#334155', transform: [{ rotate: '-8deg' }] },
  sigImg: { position: 'absolute', left: 8, top: 0, width: 176, height: 76, opacity: 0.9 },
  // Stempel menutupi ± setengah gambar tanda tangan (stamp 52-132, sig ±32-92 → overlap ~40px)
  stamp: {
    position: 'absolute', left: 52, top: 0, width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: 'rgba(30,64,175,0.55)',
    alignItems: 'center', justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
    overflow: 'hidden',
  },
  stampImg: { width: '100%', height: '100%', opacity: 0.9 },
  stampText: { fontSize: 10, fontWeight: '900', color: '#1e40af' },
  signerRow: { alignItems: 'center', width: '100%', marginBottom: 6 },
  signerName: { fontSize: 16, fontWeight: '900', color: '#111827', borderTopWidth: 1, borderTopColor: 'rgba(15,43,74,0.3)', paddingTop: 4, maxWidth: 220 },
  signerTitle: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 2, maxWidth: 220 },

  // ── Back ──
  backTitleBox: { position: 'absolute', top: 28, left: 0, right: 0, alignItems: 'center' },
  backTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 3 },
  backSubtitle: { fontSize: 15, color: '#fff', opacity: 0.9, marginTop: 4 },
  qrBox: {
    position: 'absolute', left: 48, top: 145, width: 210, height: 210,
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 4, borderColor: '#1e3a5f',
    padding: 16, alignItems: 'center', justifyContent: 'center',
  },
  qrImg: { width: '100%', height: '100%' },
  qrPlaceholder: { fontSize: 24, fontWeight: '700', color: '#94a3b8' },
  backInfoBox: {
    position: 'absolute', left: 300, top: 145, right: 48,
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(191,219,254,0.5)',
    padding: 24,
  },
  backDesc: { fontSize: 18, lineHeight: 27, color: '#0f172a', marginBottom: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backRowLabel: { width: 115, fontSize: 18, fontWeight: '900', color: '#0f2b4a', textTransform: 'uppercase' },
  backColon: { width: 18, fontSize: 18, fontWeight: '900', color: '#111827' },
  backRowValue: { flex: 1, fontSize: 18, fontWeight: '600', color: '#111827' },
  backFooter: { position: 'absolute', left: 48, right: 48, bottom: 32, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 },
  footerText: { flex: 1, fontSize: 15, lineHeight: 22, color: '#f0f9ff', opacity: 0.95 },
  footerUrl: { alignItems: 'flex-end' },
  footerUrlLabel: { fontSize: 13, color: '#f0f9ff', opacity: 0.8, textTransform: 'uppercase' },
  footerUrlValue: { fontSize: 16, fontWeight: '700', color: '#ffffff', marginTop: 2 },

  noteBox: { marginTop: 24, backgroundColor: '#fef9c3', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fde68a', width: '100%' },
  noteText: { fontSize: 13, lineHeight: 19, color: '#a16207' },
});