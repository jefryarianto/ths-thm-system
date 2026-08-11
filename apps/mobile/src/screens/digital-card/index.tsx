import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect, Defs, Pattern, LinearGradient, Stop } from 'react-native-svg';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView } from '../../components/ui/shared';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// Logo resmi THS-THM (di-bundle bersama app)
const LOGO = require('../../../assets/images/logo.png');

// Ukuran desain kartu (CR80 landscape) — seluruh layout memakai koordinat 856×540
const CARD_W = 856;
const CARD_H = 540;

// Font nomor anggota — OCR A Extended (didaftarkan via plugin expo-font di app.json)
// Nama font harus SAMA PERSIS dgn nama family internal file TTF: "OCR A Extended"
// (cek metadata TTF via System.Drawing/FontBook; nama family = "OCR A Extended", ada spasi)
const OCR_A_FONT = 'OCR A Extended';

// ─── Siluet peta Indonesia (watermark) — viewBox 0 0 400 180 ───
const INDONESIA_MAP_PATHS = [
  'M28 20 L36 16 L44 20 L52 24 L60 34 L68 46 L74 60 L78 76 L80 94 L78 110 L72 124 L62 134 L52 138 L44 134 L40 124 L38 112 L34 98 L28 84 L24 68 L22 50 L24 34 Z',
  'M42 146 L60 140 L80 138 L100 136 L122 138 L142 142 L152 146 L148 152 L138 154 L120 156 L100 156 L80 156 L62 156 L48 154 Z',
  'M120 52 L140 44 L160 40 L180 44 L196 52 L206 64 L210 80 L206 98 L196 110 L180 116 L162 116 L148 110 L136 100 L128 88 L122 74 L118 62 Z',
  'M216 60 L230 50 L244 54 L252 66 L260 78 L268 92 L272 108 L268 122 L258 130 L248 126 L242 114 L238 100 L232 86 L224 72 Z',
  'M276 52 L288 46 L298 50 L302 62 L294 72 L282 70 L276 62 Z',
  'M286 84 L300 80 L314 84 L320 96 L314 108 L300 112 L288 106 L282 96 Z',
  'M330 66 L348 56 L366 52 L382 56 L392 64 L398 76 L396 90 L390 102 L376 112 L360 116 L344 114 L334 106 L328 94 L326 80 Z',
  'M156 146 L168 142 L180 144 L186 150 L178 156 L164 156 Z',
  'M186 146 L198 148 L208 150 L214 156 L206 160 L192 158 Z',
];

/** Watermark peta Indonesia (SVG inline). */
function IndonesiaMapWatermark({ color, opacity, size = { width: 420, height: 190 } }: { color: string; opacity: number; size?: { width: number; height: number } }) {
  return (
    <Svg width={size.width} height={size.height} viewBox="0 0 400 180" style={{ opacity }}>
      {INDONESIA_MAP_PATHS.map((d, i) => (
        <Path key={i} d={d} fill={color} />
      ))}
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
      <Text style={[styles.infoValue, strong && styles.infoValueStrong]} numberOfLines={strong ? 2 : 1}>
        : {value}
      </Text>
    </View>
  );
}

function BackRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.backRow}>
      <Text style={styles.backRowLabel}>{label}</Text>
      <Text style={styles.backRowValue} numberOfLines={1}>: {value}</Text>
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
      <View style={styles.topBar} />
      <View style={styles.bottomBar} />

      {/* Guilloche / microprint border */}
      <GuillocheBorder patternId="g-front" strokeColor="rgba(29,78,216,0.3)" />

      {/* Watermark — peta Indonesia */}
      <View style={styles.watermarkWrap} pointerEvents="none">
        <IndonesiaMapWatermark color="#1e3a5f" opacity={0.05} />
      </View>

      <View style={styles.content}>
        {/* Header — 4 baris + logo */}
        <View style={styles.headerRow}>
          <View style={styles.logo}>
            <Image source={LOGO} style={styles.logoImg} resizeMode="cover" />
            {/* Hologram / foil shimmer overlay */}
            <ShimmerOverlay id="logoShimmer" width={48} height={48} colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']} borderRadius={24} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.row1} numberOfLines={1}>KARTU TANDA ANGGOTA</Text>
            <Text style={styles.row2} numberOfLines={1}>ORGANISASI PENCAK SILAT PENDIDIKAN</Text>
            <Text style={styles.orgName} numberOfLines={1}>TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA</Text>
            <Text style={styles.distrikName} numberOfLines={1}>DISTRIK KEUSKUPAN {distrik.toUpperCase()}</Text>
          </View>
        </View>

        {/* Photo */}
        <View style={styles.photoBox}>
          {member?.fotoPath ? (
            <Image source={{ uri: `${API_URL}/api/uploads/${encodeURIComponent(member.fotoPath)}` }} style={styles.photoImg} resizeMode="cover" />
          ) : (
            <Text style={styles.photoPlaceholder}>FOTO</Text>
          )}
        </View>

        {/* Level strips */}
        <View style={styles.stripsBox}>
          {Array.from({ length: lv.stripCount }).map((_, i) => (
            <View key={i} style={[styles.strip, { backgroundColor: lv.color }]} />
          ))}
        </View>

        {/* Info — SUSUNAN: Nomor dulu, baru Nama */}
        <View style={styles.infoBox}>
          <InfoRow label="No. Anggota" value={member?.nomorAnggota || '-'} strong />
          <InfoRow label="Nama" value={member?.namaLengkap || '-'} />
          <InfoRow label="Ranting" value={member?.ranting?.nama || '-'} />
          <InfoRow label="Wilayah" value={member?.ranting?.wilayah?.nama || '-'} />
          <InfoRow label="Distrik" value={distrik} />
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
            <Text style={styles.sig}>ttd</Text>
            <View style={styles.stamp}>
              <Text style={styles.stampText}>STEMPEL</Text>
            </View>
          </View>
          {(cardData?.signers && cardData.signers.length > 0
            ? cardData.signers
            : [{ signerName: cardData?.signerName || 'Koordinator Distrik', signerTitle: cardData?.signerTitle || 'THS-THM' }]
          ).map((s, i) => (
            <View key={i} style={styles.signerRow}>
              <Text style={styles.signerName} numberOfLines={1}>{s.signerName || 'Koordinator Distrik'}</Text>
              <Text style={styles.signerTitle} numberOfLines={1}>{s.signerTitle || ''}</Text>
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
      {/* Guilloche / microprint border */}
      <GuillocheBorder patternId="g-back" strokeColor="rgba(191,219,254,0.4)" />

      {/* Watermark — peta Indonesia */}
      <View style={styles.backWatermarkWrap} pointerEvents="none">
        <IndonesiaMapWatermark color="#cbd5e1" opacity={0.12} />
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
          <BackRow label="TTL" value={ttl} />
          <BackRow label="DADAR" value={dadar} />
          <BackRow label="Status" value={member?.statusKeanggotaan === 'aktif' ? 'Aktif' : 'Nonaktif'} />
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

// ─── Screen ───

export default function DigitalCardScreen() {
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Profil anggota milik user yang login (self-scope)
        const me = unwrap<MemberInfo | null>(await apiClient.get('/members/me'));
        setMember(me);
        if (me?.id) {
          try {
            const res = await apiClient.get(`/members/${me.id}/digital-card`);
            const data = unwrap<{
              qrCode: string;
              levelVisual?: { stripCount: number; color: string; label?: string } | null;
              card?: { signerName?: string; signerTitle?: string; signers?: { signerName?: string; signerTitle?: string }[] };
            }>(res);
            setCardData({
              qrCode: data.qrCode || null,
              signerName: data.card?.signerName || 'Koordinator Distrik',
              signerTitle: data.card?.signerTitle || 'THS-THM',
              signers: data.card?.signers || [],
              levelVisual: data.levelVisual || null,
            });
          } catch {
            // QR/signer gagal dimuat — kartu tetap tampil (fallback nama default)
            setCardData({ qrCode: null, signerName: 'Koordinator Distrik', signerTitle: 'THS-THM', signers: [], levelVisual: null });
          }
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingView />;

  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 5);
  const validUntilText = validUntil.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const ttl = [member?.tempatLahir, member?.tanggalLahir ? new Date(member.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null]
    .filter(Boolean)
    .join(', ') || '-';
  const dadar = [member?.tempatDadar, member?.tahunDadar].filter(Boolean).join(', ') || '-';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.containerContent}>
      <Text style={styles.pageTitle}>Kartu Anggota Digital (KTA)</Text>

      <Text style={styles.sectionLabel}>Sisi Depan</Text>
      <MemberCardFront member={member} cardData={cardData} validUntilText={validUntilText} />

      <Text style={styles.sectionLabel}>Sisi Belakang</Text>
      <MemberCardBack member={member} cardData={cardData} ttl={ttl} dadar={dadar} validUntilText={validUntilText} />

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

  // ── Canvas kartu 856×540 (di-scale oleh CardShell) ──
  cardCanvas: { width: CARD_W, height: CARD_H, borderRadius: 28, overflow: 'hidden' },
  cardFront: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1' },
  cardBack: { backgroundColor: '#1e40af', borderWidth: 1, borderColor: '#1e3a5f' },

  bgCircle1: { position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(6,182,212,0.15)' },
  bgCircle2: { position: 'absolute', bottom: -110, left: -80, width: 380, height: 380, borderRadius: 190, backgroundColor: 'rgba(29,78,216,0.08)' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 64, backgroundColor: '#1d4ed8' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: '#0f2b4a' },
  guilloche: { position: 'absolute', top: 0, left: 0 },
  shimmerOverlay: { position: 'absolute', top: 0, left: 0 },

  watermarkWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', opacity: 1 },
  watermarkLogo: { width: 260, height: 260 },
  backWatermarkWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', opacity: 1 },
  backWatermarkLogo: { width: 260, height: 260 },
  watermarkText: { fontSize: 48, fontWeight: '900', color: '#1e3a5f' },

  content: { ...StyleSheet.absoluteFillObject, zIndex: 10 },

  // ── Header — 4 baris ──
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 20, paddingTop: 20, paddingHorizontal: 40 },
  logo: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },
  logoImg: { width: 48, height: 48 },
  logoInner: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 9, fontWeight: '900', color: '#1e3a5f' },
  headerText: { flex: 1, paddingTop: 2 },
  row1: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 2.1 },
  row2: { fontSize: 11, fontWeight: '600', color: '#fff', opacity: 0.95, letterSpacing: 1.2, marginTop: 1 },
  orgName: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 0.5, marginTop: 2 },
  distrikName: { fontSize: 12.5, fontWeight: '600', color: '#fff', opacity: 0.95, marginTop: 2 },

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

  // ── Level strips ──
  stripsBox: { position: 'absolute', left: 40, top: 412, width: 185, flexDirection: 'column', gap: 6 },
  strip: { height: 14, width: '100%', borderRadius: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)' },

  // ── Info ──
  infoBox: { position: 'absolute', left: 255, top: 162, right: 40 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  infoLabel: { width: 120, fontSize: 18, fontWeight: '700', color: '#0f2b4a' },
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

  // ── Bottom ──
  bottomInfo: { position: 'absolute', left: 40, bottom: 40 },
  bottomLabel: { fontSize: 15, color: '#f0f9ff', marginBottom: 2 },
  bottomValue: { fontSize: 22, fontWeight: '900', color: '#ffffff', marginTop: 2 },

  // ── Signer ──
  signerBox: { position: 'absolute', right: 48, bottom: 36, alignItems: 'center' },
  sigWrap: { position: 'relative', width: 192, height: 80, marginBottom: 4 },
  sig: { position: 'absolute', left: 32, top: 0, fontSize: 38, fontStyle: 'italic', color: 'rgba(255,255,255,0.9)', transform: [{ rotate: '-8deg' }] },
  stamp: {
    position: 'absolute', right: 0, top: 0, width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: 'rgba(191,219,254,0.8)',
    alignItems: 'center', justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  stampText: { fontSize: 10, fontWeight: '900', color: '#1e40af' },
  signerRow: { alignItems: 'center', width: '100%', marginBottom: 6 },
  signerName: { fontSize: 16, fontWeight: '900', color: '#ffffff', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.6)', paddingTop: 4, maxWidth: 220 },
  signerTitle: { fontSize: 13, fontWeight: '600', color: '#ffffff', opacity: 0.95, marginTop: 2, maxWidth: 220 },

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
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(191,219,254,0.5)',
    padding: 24,
  },
  backDesc: { fontSize: 18, lineHeight: 27, color: '#0f172a', marginBottom: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backRowLabel: { width: 105, fontSize: 18, fontWeight: '900', color: '#0f2b4a' },
  backRowValue: { flex: 1, fontSize: 18, fontWeight: '600', color: '#111827' },
  backFooter: { position: 'absolute', left: 48, right: 48, bottom: 32, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 },
  footerText: { flex: 1, fontSize: 15, lineHeight: 22, color: '#f0f9ff', opacity: 0.95 },
  footerUrl: { alignItems: 'flex-end' },
  footerUrlLabel: { fontSize: 13, color: '#f0f9ff', opacity: 0.8 },
  footerUrlValue: { fontSize: 16, fontWeight: '700', color: '#ffffff', marginTop: 2 },

  noteBox: { marginTop: 24, backgroundColor: '#fef9c3', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fde68a', width: '100%' },
  noteText: { fontSize: 13, lineHeight: 19, color: '#a16207' },
});