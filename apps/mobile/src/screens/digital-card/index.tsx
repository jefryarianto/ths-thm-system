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
  Platform,
  Alert,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Path, Rect, Defs, Pattern, LinearGradient, Stop } from 'react-native-svg';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView, ErrorView } from '../../components/ui/shared';
import { useRefresh } from '../../hooks/use-refresh';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

// ─── Sumber tunggal desain kartu — packages/card-design (mobile/web/PDF/preview) ───
import { CARD, COLORS, FRONT, BACK, DECOR, FONTS, getLevelVisual, photoCrop } from '../../lib/card-design';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// Logo resmi THS-THM (di-bundle bersama app)
const LOGO = require('../../../assets/images/logo.png');

// Ikon siluet fallback foto — man-icon.png / woman-icon.png (root repo, siluet hitam transparan)
const MAN_ICON = require('../../../assets/images/man-icon.png');
const WOMAN_ICON = require('../../../assets/images/woman-icon.png');

// Ukuran desain kartu (CR80 landscape) — dari spec
const CARD_W = CARD.W;
const CARD_H = CARD.H;

// Font kartu — nama family harus SAMA PERSIS dgn nama internal file TTF (spec)
const OCR_A_FONT = FONTS.ocrA;
const OPEN_SANS_BOLD = FONTS.openSansBold;
const ROBOTO_REGULAR = FONTS.robotoRegular;
const ROBOTO_BOLD = FONTS.robotoBold;

// ─── Watermark peta Indonesia — peta indonesia.png (root repo, siluet hitam transparan) ───
const MAP_PNG = require('../../../assets/images/peta-indonesia.png');

/** Watermark peta Indonesia (PNG siluet, tintColor = warna). */
function IndonesiaMapWatermark({ color, opacity, size = { width: 560, height: 207 } }: { color: string; opacity: number; size?: { width: number; height: number } }) {
  return (
    <Image source={MAP_PNG} style={{ width: size.width, height: size.height, opacity, tintColor: color }} resizeMode="contain" />
  );
}

// Font label kartu — Roboto Bold (sesuai spec font kartu: label = Roboto, data = OCR A Extended, header = Open Sans)
const LABEL_FONT = ROBOTO_BOLD;

/** Latar abstrak — pita melengkung dengan gradien biru yang saling tumpang tindih
 *  (bukan blok warna solid), nuansa referensi "abstract wavy background". */
// Arah gradien ombak (x1/y1/x2/y2) — urutan sama dgn DECOR.wavyPaths & COLORS.wavy
const WAVY_GRAD: Array<[string, string, string, string]> = [
  ['0', '0', '0.6', '1'],
  ['1', '0', '0.4', '1'],
  ['0', '1', '1', '0'],
];

function WavyBackground() {
  return (
    <Svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {COLORS.wavy.map((w, i) => (
          <LinearGradient key={i} id={`w${i + 1}`} x1={WAVY_GRAD[i][0]} y1={WAVY_GRAD[i][1]} x2={WAVY_GRAD[i][2]} y2={WAVY_GRAD[i][3]}>
            <Stop offset="0" stopColor={w.from} stopOpacity={w.fromOpacity} />
            <Stop offset="1" stopColor={w.to} stopOpacity={w.toOpacity} />
          </LinearGradient>
        ))}
      </Defs>
      {DECOR.wavyPaths.map((d, i) => (
        <Path key={i} d={d} fill={`url(#w${i + 1})`} />
      ))}
    </Svg>
  );
}

/** Header — bar biru LURUS (tinggi 104px, sama dgn web/mock/previewKTA), gradien biru 45°.
 *  Tepi bawah lurus agar konsisten antar platform. */
function AbstractHeader() {
  return (
    <Svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="headGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={COLORS.header.from} />
          <Stop offset="1" stopColor={COLORS.header.to} />
        </LinearGradient>
      </Defs>
      <Path d={DECOR.headerPath} fill="url(#headGrad)" />
    </Svg>
  );
}

/** Hologram / foil shimmer — gradien diagonal tipis (cyan→putih→amber) di area data anggota,
 *  sebagai pengaman anti-pemalsuan. Memakai OPACITY level elemen (bukan stopOpacity) karena
 *  alpha pada stop react-native-svg Android diabaikan (dulu membuat overlay opak menutupi data).
 *  `kind="logo"` memakai sweep putih lembut seperti mock (logo .shimmer). */
type FoilStop = { offset: string; color: string; opacity: number };

function FoilShimmer({ kind = 'info' }: { kind?: 'info' | 'logo' | 'sig' }) {
  const cfg: { id: string; opacity: number; stops: FoilStop[] } =
    kind === 'logo'
      ? { id: 'foilLogo', opacity: 1, stops: [{ offset: '0', color: '#ffffff', opacity: 0 }, { offset: '0.5', color: '#ffffff', opacity: 0.55 }, { offset: '1', color: '#ffffff', opacity: 0 }] }
      : kind === 'sig'
        ? { id: 'foilSig', opacity: 0.25, stops: [{ offset: '0', color: '#22d3ee', opacity: 1 }, { offset: '0.5', color: '#ffffff', opacity: 1 }, { offset: '1', color: '#fcd34d', opacity: 1 }] }
        : { id: 'foilInfo', opacity: 0.15, stops: [{ offset: '0', color: '#22d3ee', opacity: 1 }, { offset: '0.5', color: '#ffffff', opacity: 1 }, { offset: '1', color: '#fcd34d', opacity: 1 }] };
  return (
    <Svg width="100%" height="100%" viewBox="0 0 400 220" style={StyleSheet.absoluteFill} opacity={cfg.opacity} pointerEvents="none">
      <Defs>
        <LinearGradient id={cfg.id} x1="0" y1="0" x2="1" y2="1">
          {cfg.stops.map((s, i) => (
            <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={400} height={220} rx={12} fill={`url(#${cfg.id})`} />
    </Svg>
  );
}

/** Gradien biru bawah — sudut 45° (arah berlawanan), cukup terang agar
 *  teks hitam penandatangan & masa berlaku tetap terbaca. */
function BottomGradient() {
  return (
    <Svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="botGrad" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={COLORS.bottom.from} stopOpacity={COLORS.bottom.fromOpacity} />
          <Stop offset="1" stopColor={COLORS.bottom.to} stopOpacity={COLORS.bottom.toOpacity} />
        </LinearGradient>
      </Defs>
      <Path d={DECOR.bottomPath} fill="url(#botGrad)" />
    </Svg>
  );
}

/** Latar belakang kartu belakang — gradien abstrak (bukan blok warna solid). */
function BackGradient() {
  return (
    <Svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="backGrad" x1="0" y1="0" x2="1" y2="1">
          {COLORS.backGradient.map((c, i) => (
            <Stop key={i} offset={i === 0 ? '0' : i === 1 ? '0.5' : '1'} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={CARD_W} height={CARD_H} fill="url(#backGrad)" />
      <Path d={DECOR.backWave} fill="#ffffff" opacity={0.06} />
    </Svg>
  );
}

/** Guilloche / microprint border — garis sinusoidal tipis mengelilingi kartu.
 *  Memakai beberapa rect berlapis (strokeDasharray) yang andal di react-native-svg,
 *  plus pattern sinusoidal halus sebagai dekorasi tambahan. */
function GuillocheBorder({ patternId, strokeColor }: { patternId: string; strokeColor: string }) {
  return (
    <Svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={styles.guilloche}>
      <Defs>
        <Pattern id={patternId} x="0" y="0" width={DECOR.guilloche.pattern.w} height={DECOR.guilloche.pattern.h} patternUnits="userSpaceOnUse">
          <Path d={DECOR.guilloche.pattern.path} fill="none" stroke={strokeColor} strokeWidth={DECOR.guilloche.pattern.strokeWidth} />
        </Pattern>
      </Defs>
      {DECOR.guilloche.rects.map((r, i) => (
        <Rect
          key={i}
          x={r.inset}
          y={r.inset}
          width={CARD_W - r.inset * 2}
          height={CARD_H - r.inset * 2}
          rx={r.rx}
          fill="none"
          stroke={strokeColor}
          strokeWidth={r.strokeWidth}
          {...(r.dash ? { strokeDasharray: r.dash } : {})}
          opacity={r.opacity}
        />
      ))}
      <Rect x={16} y={16} width={824} height={508} rx={22} fill="none" stroke={`url(#${patternId})`} strokeWidth={14} opacity={0.5} />
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
    wilayah?: { nama: string; distrik?: { nama: string; alamat?: string | null } };
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

// Tingkat → visual balok — diambil dari spec (packages/card-design) via getLevelVisual

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
      <Text style={[styles.infoValue, strong && styles.infoValueStrong]} numberOfLines={2}>
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

/** Foto anggota — TANPA bingkai; fallback siluet man/woman-icon sesuai jenis kelamin
 *  saat foto tidak ada (fotoPath kosong) ATAU gagal dimuat (onError → 404/korup). */
// Crop foto ala SIM — tampilkan hanya WAJAH (60% bagian atas pasfoto: kepala + bahu).
// Kalkulasi di spec: elementH = boxH / faceCrop, elementW = elementH × aspek pasfoto (photoCrop).
const FACE_CROP = FRONT.photo.crop.faceCrop;
const PASFOTO_ASPECT = FRONT.photo.crop.pasfotoAspect; // aspek umum pasfoto 3×4 (544×692)

function MemberPhoto({
  fotoPath,
  jenisKelamin,
  boxStyle,
  iconStyle,
  crop,
}: {
  fotoPath: string | null;
  jenisKelamin: string | null;
  boxStyle: StyleProp<ViewStyle>;
  iconStyle: StyleProp<ImageStyle>;
  crop: { w: number; h: number; left: number };
}) {
  const [failed, setFailed] = useState(false);
  // `.bg.png` = versi foto tanpa background (ala SIM) yang dihasilkan API on-demand.
  const uri = fotoPath ? `${API_URL}/api/uploads/${encodeURIComponent(fotoPath)}.bg.png` : null;
  if (!uri || failed) {
    return (
      <View style={boxStyle}>
        <Image source={jenisKelamin === 'P' ? WOMAN_ICON : MAN_ICON} style={iconStyle} resizeMode="contain" />
      </View>
    );
  }
  // Foto wajah (ala SIM): kotak menampilkan 60% atas pasfoto, di-zoom penuhi kotak (crop dari spec).
  return (
    <View style={boxStyle}>
      <Image
        source={{ uri }}
        style={[styles.photoImg, { position: 'absolute', left: crop.left, top: 0, width: crop.w, height: crop.h }]}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
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

      {/* Watermark — peta indonesia.png washout di tengah (tidak mengganggu foto kanan atas) */}
      <View style={styles.watermarkWrap} pointerEvents="none">
        <IndonesiaMapWatermark color="#1d4ed8" opacity={0.35} size={{ width: 600, height: 207 }} />
      </View>

      <View style={styles.content}>
        {/* Header — 4 baris + logo */}
        <View style={styles.headerRow}>
          <View style={styles.logo}>
            <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
            {/* Foil shimmer sweep putih lembut (anti-pemalsuan) */}
            <FoilShimmer kind="logo" />
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

        {/* Photo besar kiri — TANPA bingkai; fallback siluet man/woman-icon (onError) */}
        <MemberPhoto
          fotoPath={member?.fotoPath || null}
          jenisKelamin={member?.jenisKelamin || null}
          boxStyle={styles.photoBox}
          iconStyle={styles.photoIcon}
          crop={photoCrop(FRONT.photo.big.w, FRONT.photo.big.h)}
        />

        {/* Photo kecil kanan atas — sejajar label No. Anggota; rank (strips + nama tingkat) di bawahnya */}
        <MemberPhoto
          fotoPath={member?.fotoPath || null}
          jenisKelamin={member?.jenisKelamin || null}
          boxStyle={styles.photoBoxSmall}
          iconStyle={styles.photoIconSmall}
          crop={photoCrop(FRONT.photo.small.w, FRONT.photo.small.h)}
        />

        {/* Level rank — DI BAWAH foto kecil (kanan atas); teks nama tingkat selebar strip; sembunyi utk 'Anggota' */}
        {lv.stripCount > 0 && (
          <View style={styles.rankBox}>
            <Text style={styles.rankName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {(member?.tingkat || lv.label || '').toUpperCase()}
            </Text>
            <View style={styles.rankStrips}>
              {Array.from({ length: lv.stripCount }).map((_, i) => (
                <View key={i} style={[styles.strip, { backgroundColor: lv.color }]} />
              ))}
            </View>
          </View>
        )}

        {/* Info — No. Anggota, Nama, Tempat/Tanggal Lahir, Ranting, Wilayah — semua UPPERCASE (Distrik sudah ada di header) */}
        <View style={styles.infoBox}>
          <InfoRow label="No. Anggota" value={(member?.nomorAnggota || '-').toUpperCase()} strong />
          {/* Nama + JK — label JK sejajar label Nama (jarak 1-2 tab), data L/P sejajar data Nama */}
          <View style={styles.infoPair}>
            <View style={styles.infoPairLeft}>
              <InfoRow label="Nama" value={(member?.namaLengkap || '-').toUpperCase()} />
            </View>
            <View style={styles.jkBox}>
              <Text style={styles.infoLabel}>JK</Text>
              <Text style={styles.jkValue} numberOfLines={1}>{member?.jenisKelamin === 'P' ? 'P' : 'L'}</Text>
            </View>
          </View>
          <InfoRow
            label="Tempat, Tanggal Lahir"
            value={[
              member?.tempatLahir || '-',
              member?.tanggalLahir
                ? new Date(member.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                : '-',
            ]
              .filter(Boolean)
              .join(', ')
              .toUpperCase()}
            strong={false}
          />
          <InfoRow label="Ranting" value={(member?.ranting?.nama || '-').toUpperCase()} />
          <InfoRow label="Wilayah" value={(member?.ranting?.wilayah?.nama || '-').toUpperCase()} />

          {/* Hologram / foil shimmer — gradien diagonal tipis di atas area data anggota */}
          <View style={styles.foilOverlay} pointerEvents="none">
            <FoilShimmer kind="info" />
          </View>
        </View>

        {/* Bottom */}
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomLabel}>Berlaku sampai</Text>
          <Text style={styles.bottomValue}>{validUntilText}</Text>
        </View>

        {/* Signer — teks jabatan & keuskupan di ATAS stempel + tanda tangan, nama penandatangan di bawah */}
        <View style={styles.signerBox}>
          <Text style={styles.sigTitle1} numberOfLines={1}>KOORDINATORAT DISTRIK THS-THM</Text>
          <Text style={styles.sigTitle2} numberOfLines={1}>KEUSKUPAN {distrik.replace(/^keuskupan\s*/i, '').toUpperCase()}</Text>
          <View style={styles.sigWrap}>
            {cardData?.stampImage ? (
              <View style={styles.stamp}>
                <Image source={{ uri: `${API_URL}/api/uploads/${encodeURIComponent(cardData.stampImage)}` }} style={styles.stampImg} resizeMode="cover" />
              </View>
            ) : (
              <View style={styles.stamp}>
                <Text style={styles.stampText}>STEMPEL</Text>
              </View>
            )}
            {cardData?.signatureImage ? (
              <View style={styles.sigImgWrap}>
                {/* Ttd ditebalkan: 3 lapis identik di posisi SAMA (tanpa offset → tidak berbayang) */}
                <Image source={{ uri: `${API_URL}/api/uploads/${encodeURIComponent(cardData.signatureImage)}` }} style={styles.sigImg} resizeMode="contain" />
                <Image source={{ uri: `${API_URL}/api/uploads/${encodeURIComponent(cardData.signatureImage)}` }} style={styles.sigImg} resizeMode="contain" />
                <Image source={{ uri: `${API_URL}/api/uploads/${encodeURIComponent(cardData.signatureImage)}` }} style={styles.sigImg} resizeMode="contain" />
              </View>
            ) : (
              <Text style={styles.sig}>ttd</Text>
            )}
            {/* Foil shimmer halus di area stempel/ttd (anti-pemalsuan) */}
            <View style={styles.foilOverlay} pointerEvents="none">
              <FoilShimmer kind="sig" />
            </View>
          </View>
          {(cardData?.signers && cardData.signers.length > 0
            ? cardData.signers
            : [{ signerName: cardData?.signerName || 'Koordinator Distrik', signerTitle: cardData?.signerTitle || 'THS-THM' }]
          ).map((s, i) => (
            <View key={i} style={[styles.signerRow, { bottom: i * 34 }]}>
              {/* Nama penandatangan (underline) + jabatan — font Roboto sama dgn teks "Berlaku sampai" */}
              <Text style={styles.signerName} numberOfLines={1}>{(s.signerName || 'Koordinator Distrik').toUpperCase()}</Text>
              {s.signerTitle ? <Text style={styles.signerTitle} numberOfLines={1}>{s.signerTitle.toUpperCase()}</Text> : null}
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

      {/* Watermark — siluet peta titik halftone PUTIH di tengah */}
      <View style={styles.backWatermarkWrap} pointerEvents="none">
        <IndonesiaMapWatermark color="#ffffff" opacity={0.5} size={{ width: 480, height: 166 }} />
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
          <BackRow label="Alamat" value={`THS-THM, ${(member?.ranting?.wilayah?.distrik?.alamat || 'Distrik').toUpperCase()}`} />
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

  // ── Simpan kartu: PDF (share/save via intent) & PNG (langsung ke galeri) ──
  const [saving, setSaving] = useState<'pdf' | 'png' | null>(null);

  const memberId = member?.id;
  const savePdf = async () => {
    if (!memberId) return;
    setSaving('pdf');
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const url = `${API_URL}/api/members/${memberId}/digital-card/pdf`;
      const dest = `${FileSystem.cacheDirectory}kartu-anggota-${memberId}.pdf`;
      await FileSystem.downloadAsync(url, dest, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: 'Simpan Kartu Anggota' });
      } else {
        Alert.alert('Kartu tersimpan', `PDF tersimpan di: ${dest}`);
      }
    } catch {
      Alert.alert('Gagal', 'Gagal mengunduh PDF kartu. Periksa koneksi internet.');
    } finally {
      setSaving(null);
    }
  };

  const saveToGallery = async () => {
    if (!memberId) return;
    setSaving('png');
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const url = `${API_URL}/api/members/${memberId}/digital-card/image`;
      // documentDirectory (bukan cache) agar file tidak terhapus saat sistem membersihkan cache
      const dest = `${FileSystem.documentDirectory}kartu-anggota-${memberId}.png`;
      await FileSystem.downloadAsync(url, dest, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Izin Diperlukan', 'Aktifkan izin akses media untuk menyimpan ke galeri.');
        return;
      }

      // Simpan ke MediaStore lalu pindahkan ke album "THS-THM" di folder Pictures/
      // (saveToLibraryAsync menaruh file di root DCIM yang tidak selalu muncul di galeri).
      const asset = await MediaLibrary.createAssetAsync(dest);
      try {
        const album = await MediaLibrary.getAlbumAsync('THS-THM');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync(asset.id, album.id, false);
        } else {
          await MediaLibrary.createAlbumAsync('THS-THM', asset.id, false);
        }
      } catch {
        // Album opsional — file tetap tersimpan di MediaStore
      }
      Alert.alert('Tersimpan', 'Kartu PNG berhasil disimpan ke galeri (folder THS-THM).');
    } catch {
      Alert.alert('Gagal', 'Gagal menyimpan kartu ke galeri. Coba lagi.');
    } finally {
      setSaving(null);
    }
  };

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

  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.containerContent, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.pageTitle}>Kartu Anggota Digital (KTA)</Text>

      <FlipCard member={member} cardData={cardData} ttl={ttl} dadar={dadar} validUntilText={validUntilText} />
      <Text style={styles.flipHint}>👆 Ketuk kartu untuk melihat sisi belakang (QR verifikasi)</Text>

      {/* Simpan / unduh kartu */}
      <View style={styles.saveRow}>
        <TouchableOpacity style={[styles.saveBtn, styles.saveBtnPdf]} onPress={savePdf} disabled={!!saving} activeOpacity={0.8}>
          <Ionicons name="download-outline" size={18} color="#fff" />
          <Text style={styles.saveBtnText}>{saving === 'pdf' ? 'Menyimpan…' : 'Simpan PDF'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.saveBtn, styles.saveBtnPng]} onPress={saveToGallery} disabled={!!saving} activeOpacity={0.8}>
          <Ionicons name="image-outline" size={18} color="#fff" />
          <Text style={styles.saveBtnText}>{saving === 'png' ? 'Menyimpan…' : 'Simpan ke Galeri'}</Text>
        </TouchableOpacity>
      </View>

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

  // Tombol simpan kartu
  saveRow: { flexDirection: 'row', gap: 10, marginTop: 12, alignSelf: 'stretch' },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  saveBtnPdf: { backgroundColor: '#2563eb' },
  saveBtnPng: { backgroundColor: '#0f766e' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // ── Canvas kartu 856×540 (di-scale oleh CardShell) ──
  cardCanvas: { width: CARD_W, height: CARD_H, borderRadius: CARD.RADIUS, overflow: 'hidden' },
  // Background & border dari spec
  cardFront: { backgroundColor: COLORS.front.bg, borderWidth: 1, borderColor: COLORS.front.border },
  cardBack: { backgroundColor: COLORS.back.bg, borderWidth: 1, borderColor: COLORS.back.border },

  bgCircle1: { position: 'absolute', top: FRONT.bgCircle1.top, right: FRONT.bgCircle1.right, width: FRONT.bgCircle1.size, height: FRONT.bgCircle1.size, borderRadius: FRONT.bgCircle1.size / 2, backgroundColor: COLORS.bgCircle1 },
  bgCircle2: { position: 'absolute', bottom: FRONT.bgCircle2.bottom, left: FRONT.bgCircle2.left, width: FRONT.bgCircle2.size, height: FRONT.bgCircle2.size, borderRadius: FRONT.bgCircle2.size / 2, backgroundColor: COLORS.bgCircle2 },

  guilloche: { position: 'absolute', top: 0, left: 0 },

  // Watermark peta — posisi dari spec
  watermarkWrap: { position: 'absolute', left: FRONT.watermark.left, top: FRONT.watermark.top, width: FRONT.watermark.w, height: FRONT.watermark.h, opacity: 1 },
  watermarkLogo: { width: 260, height: 260 },
  backWatermarkWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', opacity: 1 },
  backWatermarkLogo: { width: 260, height: 260 },
  watermarkText: { fontSize: 48, fontWeight: '900', color: '#1e3a5f' },

  content: { ...StyleSheet.absoluteFillObject, zIndex: 10 },

  // ── Header — teks rata atas agar logo besar (120px) tidak mendorong teks keluar dari pita biru ──
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: FRONT.header.gap, paddingTop: FRONT.header.padTop, paddingBottom: FRONT.header.padBottom, paddingHorizontal: FRONT.header.padH },
  // Logo — ukuran dari spec
  logo: { width: FRONT.logo.size, height: FRONT.logo.size, borderRadius: FRONT.logo.radius, backgroundColor: FRONT.logo.bg, overflow: 'hidden', borderWidth: FRONT.logo.border, borderColor: FRONT.logo.borderColor },
  logoImg: { width: FRONT.logo.img, height: FRONT.logo.img, alignSelf: 'center' },
  logoInner: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 10, fontWeight: '900', color: '#171717' },
  headerText: { flex: 1 },
  // Semua baris header ukuran sama (16px), font Open Sans Bold — tinggi blok 4×20 = 80 + padding 28 = 108 ≤ 110
  row1: { fontSize: FRONT.header.row.fontSize, fontWeight: '900', color: COLORS.headerText, letterSpacing: FRONT.header.row.spacing[0], lineHeight: FRONT.header.row.lineHeight, fontFamily: OPEN_SANS_BOLD },
  row2: { fontSize: FRONT.header.row.fontSize, fontWeight: '900', color: COLORS.headerText, letterSpacing: FRONT.header.row.spacing[1], marginTop: FRONT.header.row.rowGap, lineHeight: FRONT.header.row.lineHeight, fontFamily: OPEN_SANS_BOLD },
  orgName: { fontSize: FRONT.header.row.fontSize, fontWeight: '900', color: COLORS.headerText, letterSpacing: FRONT.header.row.spacing[2], marginTop: FRONT.header.row.rowGap, lineHeight: FRONT.header.row.lineHeight, fontFamily: OPEN_SANS_BOLD },
  distrikName: { fontSize: FRONT.header.row.fontSize, fontWeight: '900', color: COLORS.headerText, marginTop: FRONT.header.row.rowGap, lineHeight: FRONT.header.row.lineHeight, fontFamily: OPEN_SANS_BOLD },

  // ── Photo besar kiri ── TANPA bingkai, top sejajar label No. Anggota (148)
  photoBox: {
    position: 'absolute', left: FRONT.photo.big.left, top: FRONT.photo.big.top, width: FRONT.photo.big.w, height: FRONT.photo.big.h,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  photoImg: { width: '100%', height: '100%' },
  photoIcon: { width: 130, height: 130, opacity: 0.9 },

  // ── Photo kecil kanan atas ── TANPA bingkai, sejajar label No. Anggota; rank di bawahnya
  photoBoxSmall: {
    position: 'absolute', right: FRONT.photo.small.right, top: FRONT.photo.small.top, width: FRONT.photo.small.w, height: FRONT.photo.small.h,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  photoIconSmall: { width: 100, height: 100, opacity: 0.9 },

  // ── Level rank ── DI BAWAH photo kecil kanan atas (jarak kecil); teks nama tingkat selebar strip; sembunyi utk 'Anggota'
  rankBox: { position: 'absolute', right: FRONT.rank.right, top: FRONT.rank.top, width: FRONT.rank.w, zIndex: 5 },
  rankName: { fontSize: FRONT.rank.name.fontSize, fontWeight: '900', color: COLORS.rankText, textAlign: 'center', letterSpacing: FRONT.rank.name.letterSpacing, marginBottom: FRONT.rank.name.marginBottom, fontFamily: ROBOTO_BOLD },
  rankStrips: { width: '100%', flexDirection: 'column', gap: FRONT.rank.strip.gap },
  strip: { height: FRONT.rank.strip.h, width: '100%', borderRadius: FRONT.rank.strip.radius, borderWidth: 1, borderColor: COLORS.rankStripBorder },

  // ── Info ── label di atas, nilai di bawah; kolom tengah (foto besar kiri + foto kecil kanan)
  infoBox: { position: 'absolute', left: FRONT.info.left, top: FRONT.info.top, right: FRONT.info.right, zIndex: 20 },
  // Foil shimmer menimpa area info (di atas teks, tipis 15% — teks tetap terbaca)
  foilOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 12, zIndex: 30 },
  // Nama + JK — label JK sejajar label Nama (jarak 1-2 tab), data L/P sejajar data Nama
  infoPair: { flexDirection: 'row' },
  infoPairLeft: { flexShrink: 1 },
  jkBox: { width: FRONT.info.jk.w, marginLeft: FRONT.info.jk.marginLeft },
  jkValue: {
    fontSize: FRONT.info.value.fontSize,
    fontWeight: '700',
    color: FRONT.info.value.color,
    marginTop: FRONT.info.value.marginTop,
    fontFamily: OCR_A_FONT,
    textShadowColor: FRONT.info.value.color,
    textShadowRadius: 1.5,
    textShadowOffset: { width: 0, height: 0 },
  },
  infoRow: { marginBottom: FRONT.info.rowMarginBottom },
  infoLabel: { fontSize: FRONT.info.label.fontSize, fontWeight: '800', color: FRONT.info.label.color, textTransform: 'uppercase', letterSpacing: FRONT.info.label.letterSpacing, fontFamily: LABEL_FONT },
  // Data anggota BOLD — OCR A Extended hanya punya weight regular, jadi di-bold via
  // simulasi shadow (teknik yang sama dengan No. Anggota) agar tidak fallback ke font sistem
  infoValue: { fontSize: FRONT.info.value.fontSize, fontWeight: '700', color: FRONT.info.value.color, marginTop: FRONT.info.value.marginTop, lineHeight: FRONT.info.value.lineHeight, fontFamily: OCR_A_FONT, textShadowColor: FRONT.info.value.color, textShadowRadius: 1.5, textShadowOffset: { width: 0, height: 0 } },
  // Nomor Anggota: pakai font OCR A Extended (di-bold via simulasi shadow kuat,
  // karena varian asli font OCR A Extended hanya tersedia weight regular;
  // fontWeight di React Native dengan fontFamily custom berisiko fallback ke font sistem)
  infoValueStrong: {
    fontSize: FRONT.info.valueStrong.fontSize,
    fontFamily: OCR_A_FONT,
    color: FRONT.info.valueStrong.color,
    letterSpacing: FRONT.info.valueStrong.letterSpacing,
    marginTop: FRONT.info.valueStrong.marginTop,
    textShadowColor: FRONT.info.valueStrong.color,
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 0 },
  },

  // ── Bottom ── masa berlaku: proper case, diperkecil mengikuti ukuran nama penandatangan (16px)
  // Jarak bawah teks masa berlaku = jarak atas teks header (14px)
  bottomInfo: { position: 'absolute', left: FRONT.bottom.left, bottom: FRONT.bottom.bottom },
  bottomLabel: { fontSize: FRONT.bottom.label.fontSize, fontWeight: '700', color: FRONT.bottom.label.color, marginBottom: FRONT.bottom.label.marginBottom, fontFamily: LABEL_FONT },
  bottomValue: { fontSize: FRONT.bottom.value.fontSize, fontWeight: '700', color: FRONT.bottom.value.color, marginTop: FRONT.bottom.value.marginTop, fontFamily: ROBOTO_BOLD },

  // ── Signer ── diletakkan di bawah data Wilayah (top box ≈ 392), blok digeser ke kanan (right 24);
  // teks KOORDINATOR/KEUSKUPAN di atas; stempel (border tipis, tdk ditebalkan) + ttd di tengah;
  // nama (underline) + jabatan di bawah, font Roboto sama dgn "Berlaku sampai"
  // Grup pengesahan dinaikkan (bottom 14) agar bagian bawah teks sejajar dengan tanggal masa laku,
  // dan digeser ke kanan (right -8 → left 464) sesuai mock
  signerBox: { position: 'absolute', right: FRONT.signer.right, bottom: FRONT.signer.bottom, width: FRONT.signer.w, height: FRONT.signer.h },
  // Teks KOORDINATORAT: tepi atas (top 35) tepat berhimpit dengan tepi atas stempel (sigWrap top 35)
  sigTitle1: { position: 'absolute', left: FRONT.signer.title1.left, top: FRONT.signer.title1.top, fontSize: FRONT.signer.title1.fontSize, fontWeight: '900', color: COLORS.value, fontFamily: ROBOTO_BOLD, textAlign: 'left' },
  sigTitle2: { position: 'absolute', left: FRONT.signer.title2.left, top: FRONT.signer.title2.top, fontSize: FRONT.signer.title2.fontSize, fontWeight: '700', color: COLORS.value, fontFamily: ROBOTO_BOLD, textAlign: 'left' },
  // ttd ditebalkan via 3 lapis di posisi sama (bukan berbayang) — ukuran dari spec
  sigWrap: { position: 'absolute', left: FRONT.signer.wrap.left, top: FRONT.signer.wrap.top, width: FRONT.signer.wrap.w, height: FRONT.signer.wrap.h },
  sig: { position: 'absolute', left: FRONT.signer.sig.left, top: FRONT.signer.sig.top, fontSize: FRONT.signer.sig.fontSize, fontStyle: 'italic', color: FRONT.signer.sig.color, transform: [{ rotate: `${FRONT.signer.sig.rotate}deg` }], fontFamily: ROBOTO_REGULAR },
  sigImgWrap: { position: 'absolute', left: FRONT.signer.sig.left, top: FRONT.signer.sig.top, width: FRONT.signer.sig.w, height: FRONT.signer.sig.h },
  sigImg: { position: 'absolute', left: 0, top: 0, width: FRONT.signer.sig.w, height: FRONT.signer.sig.h, opacity: 0.7, transform: [{ rotate: `${FRONT.signer.sig.rotate}deg` }] },
  stamp: {
    position: 'absolute', left: FRONT.signer.stamp.left, top: FRONT.signer.stamp.top, width: FRONT.signer.stamp.size, height: FRONT.signer.stamp.size, borderRadius: FRONT.signer.stamp.radius,
    borderWidth: FRONT.signer.stamp.border, borderColor: COLORS.stampBorder,
    alignItems: 'center', justifyContent: 'center',
    transform: [{ rotate: `${FRONT.signer.stamp.rotate}deg` }],
    overflow: 'hidden',
  },
  stampImg: { width: '100%', height: '100%' },
  stampText: { fontSize: FRONT.signer.stamp.text.fontSize, fontWeight: '900', color: COLORS.stampText, fontFamily: ROBOTO_BOLD },
  // Nama + jabatan menimpa bagian bawah stempel (zIndex di atas), rata kiri
  signerRow: { position: 'absolute', left: 0, bottom: 0, zIndex: 5, alignItems: 'flex-start', width: '100%' },
  signerName: { fontSize: FRONT.signer.name.fontSize, fontWeight: '900', color: COLORS.value, fontFamily: ROBOTO_BOLD, textDecorationLine: 'underline' },
  signerTitle: { fontSize: FRONT.signer.title.fontSize, fontWeight: '700', color: COLORS.value, marginTop: FRONT.signer.title.marginTop, fontFamily: ROBOTO_BOLD },

  // ── Back ──
  backTitleBox: { position: 'absolute', top: BACK.title.top, left: 0, right: 0, alignItems: 'center' },
  backTitle: { fontSize: BACK.title.fontSize, fontWeight: '900', color: COLORS.white, letterSpacing: BACK.title.letterSpacing, fontFamily: ROBOTO_BOLD },
  backSubtitle: { fontSize: BACK.title.subtitle.fontSize, color: COLORS.white, opacity: 0.9, marginTop: BACK.title.subtitle.marginTop, fontFamily: ROBOTO_REGULAR },
  qrBox: {
    position: 'absolute', left: BACK.qr.left, top: BACK.qr.top, width: BACK.qr.size, height: BACK.qr.size,
    backgroundColor: BACK.qr.bg, borderRadius: BACK.qr.radius, borderWidth: BACK.qr.border, borderColor: BACK.qr.borderColor,
    padding: BACK.qr.padding, alignItems: 'center', justifyContent: 'center',
  },
  qrImg: { width: '100%', height: '100%' },
  qrPlaceholder: { fontSize: 24, fontWeight: '700', color: '#94a3b8' },
  // Area teks belakang transparan (tanpa kotak putih) — teks putih langsung di atas gradien
  backInfoBox: {
    position: 'absolute', left: BACK.info.left, top: BACK.info.top, right: BACK.info.right,
    padding: BACK.info.padding,
  },
  backDesc: { fontSize: BACK.info.desc.fontSize, lineHeight: BACK.info.desc.lineHeight, color: COLORS.white, opacity: BACK.info.desc.opacity, marginBottom: BACK.info.desc.marginBottom, fontFamily: ROBOTO_REGULAR },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: BACK.info.row.marginBottom },
  backRowLabel: { width: BACK.info.row.label.w, fontSize: BACK.info.row.label.fontSize, fontWeight: '700', color: COLORS.white, textTransform: 'uppercase', fontFamily: LABEL_FONT },
  backColon: { width: BACK.info.row.colon.w, fontSize: BACK.info.row.label.fontSize, fontWeight: '700', color: COLORS.white, opacity: 0.9 },
  backRowValue: { flex: 1, fontSize: BACK.info.row.value.fontSize, fontWeight: '600', color: COLORS.white, fontFamily: ROBOTO_REGULAR },
  backFooter: { position: 'absolute', left: BACK.footer.left, right: BACK.footer.right, bottom: BACK.footer.bottom, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 },
  footerText: { flex: 1, fontSize: BACK.footer.text.fontSize, lineHeight: BACK.footer.text.lineHeight, color: '#f0f9ff', opacity: BACK.footer.text.opacity, fontFamily: ROBOTO_REGULAR },
  footerUrl: { alignItems: 'flex-end' },
  footerUrlLabel: { fontSize: BACK.footer.urlLabel.fontSize, color: '#f0f9ff', opacity: BACK.footer.urlLabel.opacity, textTransform: 'uppercase', fontFamily: ROBOTO_REGULAR },
  footerUrlValue: { fontSize: BACK.footer.urlValue.fontSize, fontWeight: '700', color: COLORS.white, marginTop: BACK.footer.urlValue.marginTop, fontFamily: ROBOTO_BOLD },

  noteBox: { marginTop: 24, backgroundColor: '#fef9c3', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fde68a', width: '100%' },
  noteText: { fontSize: 13, lineHeight: 19, color: '#a16207' },
});