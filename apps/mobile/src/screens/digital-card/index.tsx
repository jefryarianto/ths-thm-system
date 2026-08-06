import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView } from '../../components/ui/shared';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// Ukuran desain kartu (CR80 landscape) — seluruh layout memakai koordinat 856×540
const CARD_W = 856;
const CARD_H = 540;

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
}

// ─── Tingkat → visual balok (sesuai template desain) ───

const TINGKAT_LEVEL: Record<string, { stripCount: number; color: string; label: string }> = {
  Pratama: { stripCount: 2, color: '#b91c1c', label: 'Balok Merah II' },
  Tamtama: { stripCount: 2, color: '#1d4ed8', label: 'Balok Biru II' },
  Muda:    { stripCount: 2, color: '#ca8a04', label: 'Balok Kuning II' },
  Madya:   { stripCount: 2, color: '#15803d', label: 'Balok Hijau II' },
  Utama:   { stripCount: 2, color: '#1e293b', label: 'Balok Hitam II' },
};

function getLevelVisual(tingkat?: string | null) {
  return (tingkat && TINGKAT_LEVEL[tingkat]) || { stripCount: 1, color: '#94a3b8', label: 'Balok' };
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
  const lv = getLevelVisual(member?.tingkat);
  const distrik = member?.ranting?.wilayah?.distrik?.nama || 'THS-THM';

  return (
    <CardShell>
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.topBar} />
      <View style={styles.bottomBar} />
      <View style={styles.borderInner} />

      {/* Watermark */}
      <View style={styles.watermarkWrap} pointerEvents="none">
        <View style={styles.watermarkCircle}>
          <Text style={styles.watermarkText}>THS</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.logo}>
            <View style={styles.logoInner}>
              <Text style={styles.logoText}>THS</Text>
            </View>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.orgName} numberOfLines={2}>TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA</Text>
            <Text style={styles.distrikName} numberOfLines={1}>DISTRIK {distrik.toUpperCase()}</Text>
          </View>
        </View>

        {/* Title badge */}
        <View style={styles.titleBadge}>
          <Text style={styles.titleText}>KARTU TANDA ANGGOTA</Text>
        </View>

        {/* Photo */}
        <View style={styles.photoBox}>
          {member?.fotoPath ? (
            <Image source={{ uri: `${API_URL}/api/uploads/${member.fotoPath}` }} style={styles.photoImg} resizeMode="cover" />
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

        {/* Info */}
        <View style={styles.infoBox}>
          <InfoRow label="Nama" value={member?.namaLengkap || '-'} strong />
          <InfoRow label="No. Anggota" value={member?.nomorAnggota || '-'} />
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
            <Text style={styles.sig}>ttd</Text>
            <View style={styles.stamp}>
              <Text style={styles.stampText}>STEMPEL</Text>
            </View>
          </View>
          <Text style={styles.signerName} numberOfLines={1}>{cardData?.signerName || 'Koordinator Distrik'}</Text>
          <Text style={styles.signerTitle} numberOfLines={1}>{cardData?.signerTitle || 'THS-THM'}</Text>
        </View>
      </View>
    </CardShell>
  );
}

// ─── Sisi Belakang ───

function MemberCardBack({ member, cardData, ttl, dadar, validUntilText }: { member: MemberInfo | null; cardData: CardData | null; ttl: string; dadar: string; validUntilText: string }) {
  return (
    <CardShell dark>
      <View style={styles.borderInner} />

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
            const data = unwrap<{ qrCode: string; card?: { signerName?: string; signerTitle?: string } }>(res);
            setCardData({
              qrCode: data.qrCode || null,
              signerName: data.card?.signerName || 'Koordinator Distrik',
              signerTitle: data.card?.signerTitle || 'THS-THM',
            });
          } catch {
            // QR/signer gagal dimuat — kartu tetap tampil (fallback nama default)
            setCardData({ qrCode: null, signerName: 'Koordinator Distrik', signerTitle: 'THS-THM' });
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
  borderInner: {
    position: 'absolute',
    top: 18, left: 18, right: 18, bottom: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(250,204,21,0.6)',
  },

  watermarkWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', opacity: 0.06 },
  watermarkCircle: { width: 240, height: 240, borderRadius: 120, borderWidth: 18, borderColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center' },
  watermarkText: { fontSize: 48, fontWeight: '900', color: '#1e3a5f' },

  content: { ...StyleSheet.absoluteFillObject, zIndex: 10 },

  // ── Header ──
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 20, paddingTop: 24, paddingHorizontal: 40 },
  logo: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fde047', borderWidth: 4, borderColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  logoInner: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 9, fontWeight: '900', color: '#1e3a5f' },
  headerText: { flex: 1, paddingTop: 2 },
  orgName: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  distrikName: { fontSize: 17, fontWeight: '600', color: '#fff', opacity: 0.95, marginTop: 2 },

  // ── Title badge ──
  titleBadge: { position: 'absolute', top: 92, left: 0, right: 0, alignItems: 'center' },
  titleText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e3a5f',
    letterSpacing: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#eab308',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 32,
    overflow: 'hidden',
  },

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
  infoLabel: { width: 120, fontSize: 18, fontWeight: '700', color: '#1e3a5f' },
  infoValue: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1e293b' },
  infoValueStrong: { fontSize: 25, fontWeight: '900', color: '#1e3a5f' },

  // ── Bottom ──
  bottomInfo: { position: 'absolute', left: 40, bottom: 40 },
  bottomLabel: { fontSize: 15, color: '#fff', opacity: 0.9 },
  bottomValue: { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 2 },

  // ── Signer ──
  signerBox: { position: 'absolute', right: 48, bottom: 36, alignItems: 'center' },
  sigWrap: { position: 'relative', width: 192, height: 80, marginBottom: 4 },
  sig: { position: 'absolute', left: 32, top: 0, fontSize: 38, fontStyle: 'italic', color: 'rgba(15,23,42,0.8)', transform: [{ rotate: '-8deg' }] },
  stamp: {
    position: 'absolute', right: 0, top: 0, width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: 'rgba(191,219,254,0.8)',
    alignItems: 'center', justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  stampText: { fontSize: 10, fontWeight: '900', color: '#dbeafe' },
  signerName: { fontSize: 16, fontWeight: '900', color: '#fff', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.6)', paddingTop: 4, maxWidth: 220 },
  signerTitle: { fontSize: 13, fontWeight: '600', color: '#fff', opacity: 0.95, marginTop: 2, maxWidth: 220 },

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
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(191,219,254,0.5)',
    padding: 24,
  },
  backDesc: { fontSize: 18, lineHeight: 27, color: '#334155', marginBottom: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backRowLabel: { width: 105, fontSize: 18, fontWeight: '900', color: '#1e3a5f' },
  backRowValue: { flex: 1, fontSize: 18, fontWeight: '600', color: '#334155' },
  backFooter: { position: 'absolute', left: 48, right: 48, bottom: 32, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 },
  footerText: { flex: 1, fontSize: 15, lineHeight: 22, color: '#fff', opacity: 0.95 },
  footerUrl: { alignItems: 'flex-end' },
  footerUrlLabel: { fontSize: 13, color: '#fff', opacity: 0.8 },
  footerUrlValue: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 2 },

  noteBox: { marginTop: 24, backgroundColor: '#fef9c3', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fde68a', width: '100%' },
  noteText: { fontSize: 13, lineHeight: 19, color: '#a16207' },
});
