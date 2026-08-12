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
} from 'react-native';
import Svg, { Path, Rect, Defs, Pattern, LinearGradient, Stop } from 'react-native-svg';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView, ErrorView } from '../../components/ui/shared';
import { useRefresh } from '../../hooks/use-refresh';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// Logo resmi THS-THM (di-bundle bersama app)
const LOGO = require('../../../assets/images/logo.png');

// Ikon siluet fallback foto — man-icon.png / woman-icon.png (root repo, siluet hitam transparan)
const MAN_ICON = require('../../../assets/images/man-icon.png');
const WOMAN_ICON = require('../../../assets/images/woman-icon.png');

// Ukuran desain kartu (CR80 landscape) — seluruh layout memakai koordinat 856×540
const CARD_W = 856;
const CARD_H = 540;

// Font nomor anggota — OCR A Extended (didaftarkan via plugin expo-font di app.json)
// Nama font harus SAMA PERSIS dgn nama family internal file TTF: "OCR A Extended"
// (cek metadata TTF via System.Drawing/FontBook; nama family = "OCR A Extended", ada spasi)
const OCR_A_FONT = 'OCR A Extended';

// ─── Watermark peta Indonesia — peta indonesia.png (root repo, siluet hitam transparan) ───
const MAP_PNG = require('../../../assets/images/peta-indonesia.png');

/** Watermark peta Indonesia (PNG siluet, tintColor = warna). */
function IndonesiaMapWatermark({ color, opacity, size = { width: 560, height: 207 } }: { color: string; opacity: number; size?: { width: number; height: number } }) {
  return (
    <Image source={MAP_PNG} style={{ width: size.width, height: size.height, opacity, tintColor: color }} resizeMode="contain" />
  );
}

// Font label kartu — berbeda dari font data (serif); Android pakai generic 'serif', iOS 'Georgia'
const LABEL_FONT = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'serif';

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

      {/* Watermark — peta indonesia.png washout di tengah-kanan (tidak mengenai bingkai foto) */}
      <View style={styles.watermarkWrap} pointerEvents="none">
        <IndonesiaMapWatermark color="#1d4ed8" opacity={0.75} size={{ width: 600, height: 207 }} />
      </View>

      <View style={styles.content}>
        {/* Header — 4 baris + logo */}
        <View style={styles.headerRow}>
          <View style={styles.logo}>
            <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
            {/* Hologram / foil shimmer overlay */}
            <ShimmerOverlay id="logoShimmer" width={80} height={80} colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']} borderRadius={40} />
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

        {/* Photo — fallback ikon man-icon.png / woman-icon.png sesuai jenis kelamin bila tanpa foto */}
        <View style={styles.photoBox}>
          {member?.fotoPath ? (
            <Image source={{ uri: `${API_URL}/api/uploads/${encodeURIComponent(member.fotoPath)}` }} style={styles.photoImg} resizeMode="cover" />
          ) : (
            <Image source={member?.jenisKelamin === 'P' ? WOMAN_ICON : MAN_ICON} style={styles.photoIcon} resizeMode="contain" />
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
        </View>

        {/* Bottom */}
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomLabel}>Berlaku sampai</Text>
          <Text style={styles.bottomValue}>{validUntilText}</Text>
        </View>

        {/* Signer — stempel diameter 2,2 cm (220 px ≈ 2,2 cm pada skala CR80 856 px = 8.56 cm), cap yang di-upload di dalamnya, ttd di atas stempel */}
        <View style={styles.signerBox}>
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
              <Image source={{ uri: `${API_URL}/api/uploads/${encodeURIComponent(cardData.signatureImage)}` }} style={styles.sigImg} resizeMode="contain" />
            ) : (
              <Text style={styles.sig}>ttd</Text>
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
        <IndonesiaMapWatermark color="#ffffff" opacity={0.85} size={{ width: 480, height: 166 }} />
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

  // Watermark peta — digeser ke kanan agar tidak mengenai bingkai foto (foto s/d x=225)
  watermarkWrap: { position: 'absolute', left: 230, top: 166, width: 600, height: 207, opacity: 1 },
  watermarkLogo: { width: 260, height: 260 },
  backWatermarkWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', opacity: 1 },
  backWatermarkLogo: { width: 260, height: 260 },
  watermarkText: { fontSize: 48, fontWeight: '900', color: '#1e3a5f' },

  content: { ...StyleSheet.absoluteFillObject, zIndex: 10 },

  // ── Header — 4 baris, seluruhnya muat di dalam bar biru (height 104) ──
  // Blok teks: 19+15+22+16+3(margin) = 75px + padding vertikal 28 = 103 ≤ 104 → tidak ada overflow
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 14, paddingBottom: 14, paddingHorizontal: 24 },
  // Logo setinggi blok teks header (±80px: 4 baris × 19px + 3 margin)
  logo: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.95)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3, borderWidth: 2, borderColor: '#ffffff' },
  logoImg: { width: 76, height: 76, alignSelf: 'center' },
  logoInner: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 10, fontWeight: '900', color: '#171717' },
  headerText: { flex: 1 },
  // Semua baris header ukuran sama (16px) & di-bold — tinggi blok 4×20 = 80 + padding 28 = 108 ≤ 110
  row1: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 2, lineHeight: 19 },
  row2: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 1.1, marginTop: 1, lineHeight: 19 },
  orgName: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 0.5, marginTop: 1, lineHeight: 19 },
  distrikName: { fontSize: 16, fontWeight: '900', color: '#fff', marginTop: 1, lineHeight: 19 },

  // ── Photo ── top sejajar dengan label No. Anggota (148)
  photoBox: {
    position: 'absolute', left: 40, top: 148, width: 185, height: 235,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    borderWidth: 4,
    borderColor: '#fff',
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  photoImg: { width: '100%', height: '100%' },
  photoIcon: { width: 130, height: 130, opacity: 0.9 },

  // ── Level strips ── berjarak 12px dari bingkai foto (photo bottom = 148+235 = 383)
  stripsBox: { position: 'absolute', left: 40, top: 395, width: 185, flexDirection: 'column', gap: 6 },
  strip: { height: 14, width: '100%', borderRadius: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)' },

  // ── Info ── label di atas, nilai di bawah; kolom lebar ke kanan (stempel 2,2 cm di pojok),
  // zIndex di atas stempel agar teks tetap di depan & tidak wrap
  infoBox: { position: 'absolute', left: 240, top: 148, right: 40, zIndex: 20 },
  infoRow: { marginBottom: 13 },
  infoLabel: { fontSize: 12, fontWeight: '800', color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: LABEL_FONT },
  infoValue: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 3, lineHeight: 20 },
  // Nomor Anggota: pakai font OCR A Extended (di-bold via simulasi shadow kuat,
  // karena varian asli font OCR A Extended hanya tersedia weight regular;
  // fontWeight di React Native dengan fontFamily custom berisiko fallback ke font sistem)
  infoValueStrong: {
    fontSize: 19,
    fontFamily: OCR_A_FONT,
    color: '#0f2b4a',
    letterSpacing: 1.2,
    marginTop: 3,
    textShadowColor: '#0f2b4a',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 0 },
  },

  // ── Bottom ── masa berlaku: proper case, diperkecil mengikuti ukuran nama penandatangan (16px)
  // Jarak bawah teks masa berlaku = jarak atas teks header (14px)
  bottomInfo: { position: 'absolute', left: 40, bottom: 14 },
  bottomLabel: { fontSize: 13, fontWeight: '700', color: '#1e3a5f', marginBottom: 2, fontFamily: LABEL_FONT },
  bottomValue: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 2 },

  // ── Signer ── stempel diameter 1,1 cm (110 px = 50% dari 220 px), cap di-upload di dalamnya,
  // ttd di atas stempel, nama/jabatan hitam di bawah tanpa garis; jarak bawah = 14px (sama dgn header)
  // Container 220px agar nama/jabatan tidak wrap; stempel 110px di tengah
  signerBox: { position: 'absolute', right: 0, bottom: 14, width: 220, alignItems: 'center' },
  sigWrap: { position: 'relative', width: 110, height: 110, marginBottom: 2, alignSelf: 'center' },
  sig: { position: 'absolute', left: 22, top: 81, fontSize: 16, fontStyle: 'italic', color: '#334155', transform: [{ rotate: '-8deg' }] },
  sigImg: { position: 'absolute', left: 20, top: 79, width: 70, height: 29, opacity: 0.95, transform: [{ rotate: '-8deg' }] },
  stamp: {
    position: 'absolute', left: 0, top: 0, width: 110, height: 110, borderRadius: 55,
    borderWidth: 4, borderColor: 'rgba(30,64,175,0.45)',
    alignItems: 'center', justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
    overflow: 'hidden',
  },
  stampImg: { width: '100%', height: '100%' },
  stampText: { fontSize: 11, fontWeight: '900', color: '#1e40af' },
  signerRow: { alignItems: 'center', width: '100%', marginBottom: 4 },
  signerName: { fontSize: 14, fontWeight: '900', color: '#111827', maxWidth: 220, textAlign: 'center' },
  signerTitle: { fontSize: 12, fontWeight: '600', color: '#111827', marginTop: 2, maxWidth: 220, textAlign: 'center' },

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
  backRowLabel: { width: 115, fontSize: 18, fontWeight: '900', color: '#0f2b4a', textTransform: 'uppercase', fontFamily: LABEL_FONT },
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