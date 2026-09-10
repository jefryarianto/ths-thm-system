import React from 'react';
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { safeIconName } from '../../lib/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface BackButtonProps {
  /** warna ikon panah (default putih) */
  color?: string;
  /** background tombol (default gelap semi-transparan) */
  bg?: string;
  /** override handler (default: router.back()) */
  onPress?: () => void;
}

/** Tombol/ikon kembali — melayang di kiri-atas setiap halaman (safe-area aware). */
export function BackButton({ color = theme.colors.textOnPrimary, bg = theme.colors.overlay, onPress }: BackButtonProps) {
  const insets = useSafeAreaInsets();
  return (
    <TouchableOpacity
      style={[styles.backBtn, { top: insets.top + theme.spacing.sm, backgroundColor: bg }]}
      onPress={onPress || (() => (router.canGoBack() ? router.back() : router.replace('/')))}       hitSlop={10}
      activeOpacity={0.7}
      accessibilityLabel="Kembali"
    >
      <Ionicons name="arrow-back" size={22} color={color} />
    </TouchableOpacity>
  );
}

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
}

/** Spinner standar untuk proses singkat, misalnya pada tombol yang sedang diproses. */
export function LoadingSpinner({
  size = 'small',
  color = theme.colors.primary,
}: LoadingSpinnerProps) {
  return <ActivityIndicator size={size} color={color} accessibilityLabel="Memuat" />;
}

interface LoadingViewProps extends LoadingSpinnerProps {
  message?: string;
}

/** Tampilan loading layar penuh yang konsisten dengan indikator loading aplikasi. */
export function LoadingView({
  message = 'Memuat...',
  size = 'large',
  color = theme.colors.primary,
}: LoadingViewProps) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={message}>
      <LoadingSpinner size={size} color={color} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
interface StatusBadgeProps {
  label: string;
  color: string;
  bg: string;
}

export function StatusBadge({ label, color, bg }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

interface FilterChipProps {
  options: { value: string; label: string }[];
  selected: string;
  onChange: (value: string) => void;
}

export function FilterChips({ options, selected, onChange }: FilterChipProps) {
  return (
    <View style={styles.filterRow}>
      {options.map((f) => (
        <TouchableOpacity
          key={f.value}
          style={[styles.filterChip, selected === f.value && styles.filterChipActive]}
          onPress={() => onChange(f.value)}
        >
          <Text style={[styles.filterText, selected === f.value && styles.filterTextActive]}>
            {f.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = 'Cari...' }: SearchBarProps) {
  return (
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={16} color={theme.colors.textMuted} />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        value={value}
        onChangeText={onChangeText}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── InfoRow (for reference detail screens) ────────────────────

export interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
}

export function SectionTitle({ icon, text }: { icon: string; text: string }) {
  return (
    <Text style={referenceStyles.sectionTitle}>
      <Ionicons name={safeIconName(icon)} size={16} color={theme.colors.primary} /> {text}
    </Text>
  );
}

export function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={referenceStyles.infoRow}>
      <Ionicons name={safeIconName(icon)} size={15} color={theme.colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={referenceStyles.infoLabel}>{label}</Text>
        <Text style={referenceStyles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Helpers (used by StatusCard) ────────────────────────────────

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtDateTime(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── StatusCard (for reference detail status headers) ─────────────

interface StatusCardProps {
  icon: string;
  color: string;
  bg: string;
  title: string;
  badgeLabel: string;
  variant?: 'header' | 'centered';
  createdAt?: string;
  updatedAt?: string;
  subtitle?: string;
  id?: string;
}

/**
 * Status header card used in reference detail screens.
 * 'header' variant: colored left border, icon+title row, timeline rows.
 * 'centered' variant: centered icon+title+subtitle+badge (for letters).
 */
export function StatusCard({
  icon,
  color,
  bg,
  title,
  badgeLabel,
  variant = 'header',
  createdAt,
  updatedAt,
  subtitle,
  id,
}: StatusCardProps) {
  if (variant === 'centered') {
    return (
      <View style={referenceStyles.statusCardCentered}>
        <View style={[referenceStyles.statusIconBoxCentered, { backgroundColor: bg }]}>
          <Ionicons name={safeIconName(icon)} size={32} color={color} />
        </View>
        {subtitle && <Text style={referenceStyles.statusSubtitle}>{subtitle}</Text>}
        <Text style={referenceStyles.statusTitleCentered}>{title}</Text>
        <View style={[referenceStyles.badgeContainer, { backgroundColor: bg }]}>
          <Text style={[referenceStyles.badgeText, { color }]}>{badgeLabel}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[referenceStyles.statusHeader, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={referenceStyles.statusRow}>
        <View style={[referenceStyles.statusIconBox, { backgroundColor: bg }]}>
          <Ionicons name={safeIconName(icon)} size={28} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={referenceStyles.statusTitle}>{title}</Text>
          <View style={[referenceStyles.badgeContainer, { backgroundColor: bg }]}>
            <Text style={[referenceStyles.badgeText, { color }]}>{badgeLabel}</Text>
          </View>
        </View>
      </View>
      {subtitle && (
        <Text style={referenceStyles.idText}>{subtitle}</Text>
      )}
      {createdAt && (
        <View style={referenceStyles.timelineRow}>
          <Ionicons name="calendar-outline" size={13} color={theme.colors.textMuted} />
          <Text style={referenceStyles.timelineText}>Diajukan {fmtDate(createdAt)}</Text>
        </View>
      )}
      {updatedAt && (
        <View style={referenceStyles.timelineRow}>
          <Ionicons name="refresh-outline" size={13} color={theme.colors.textMuted} />
          <Text style={referenceStyles.timelineText}>Diperbarui {fmtDateTime(updatedAt)}</Text>
        </View>
      )}
      {id && <Text style={referenceStyles.idText}>ID: {id}</Text>}
    </View>
  );
}

// ─── ProfileCard (for member / candidate reference screens) ──────

interface ProfileCardProps {
  name: string;
  initial: string;
  badgeLabel: string;
  badgeColor: string;
  badgeBg: string;
  subtitle?: string;
  containerStyle?: ViewStyle;
}

/**
 * Profile card with avatar circle + name + status badge + optional subtitle.
 */
export function ProfileCard({ name, initial, badgeLabel, badgeColor, badgeBg, subtitle, containerStyle }: ProfileCardProps) {
  return (
    <View style={[referenceStyles.profileCard, containerStyle]}>
      <View style={referenceStyles.avatarLarge}>
        <Text style={referenceStyles.avatarText}>{initial}</Text>
      </View>
      <Text style={referenceStyles.name}>{name}</Text>
      <View style={[referenceStyles.statusBadge, { backgroundColor: badgeBg }]}>
        <Text style={[referenceStyles.statusText, { color: badgeColor }]}>{badgeLabel}</Text>
      </View>
      {subtitle && <Text style={referenceStyles.rantingText}>{subtitle}</Text>}
    </View>
  );
}

// ─── ScreenShell (merged shared layout for all detail/reference screens) ─

interface ScreenShellProps {
  title: string;
  children: React.ReactNode;
  variant: 'detail' | 'reference';
  onRefresh?: () => void;
  badgeLabel?: string;
  badgeColor?: string;
  badgeBg?: string;
}

/**
 * Wraps content with the standard blue header (back button + title +
 * optional refresh button for 'reference' variant, optional status badge
 * for glanceable status at the top of the screen) and a ScrollView.
 *
 * - 'detail' variant: static back+title header, paddingTop 60, no badge
 * - 'reference' variant: back+title+refresh button, paddingTop 54, supports badge
 */
export function ScreenShell({ title, children, variant, onRefresh, badgeLabel, badgeColor, badgeBg }: ScreenShellProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={shellStyles.container}>
      <View style={[shellStyles.header, { paddingTop: insets.top + (variant === 'detail' ? 16 : 12) }, variant === 'detail' ? shellStyles.headerDetail : shellStyles.headerReference]}>
        <TouchableOpacity onPress={() => router.back()} style={shellStyles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textOnPrimary} />
        </TouchableOpacity>
        <Text style={shellStyles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {badgeLabel && badgeColor && badgeBg && (
          <View style={[shellStyles.headerBadge, { backgroundColor: badgeBg }]}>
            <Text style={[shellStyles.headerBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
          </View>
        )}
        {variant === 'reference' && onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={shellStyles.refreshBtn}>
            <Ionicons name="refresh" size={20} color={theme.colors.headerSub} />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView style={shellStyles.scroll} contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl + theme.spacing.sm }}>
        {children}
      </ScrollView>
    </View>
  );
}

/**
 * Renders the ID-guard / loading / error states shared by all
 * reference detail screens. Returns null when in success state
 * (caller should render ScreenShell with variant="reference" instead).
 */
export function ReferenceScreenState({
  id,
  loading,
  error,
  title,
  onRetry,
}: {
  id: string | undefined;
  loading: boolean;
  error: string | null;
  title: string;
  onRetry: () => void;
}) {
  const insets = useSafeAreaInsets();
  const safeHeader = { backgroundColor: theme.colors.header, paddingTop: insets.top + theme.spacing.md, paddingBottom: theme.spacing.md + 2, paddingHorizontal: theme.spacing.lg } as const;

  // ID guard
  if (!id) {
    return (
      <View style={referenceStyles.container}>
        <View style={safeHeader}>
          <View style={referenceStyles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={referenceStyles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={theme.colors.textOnPrimary} />
            </TouchableOpacity>
            <Text style={referenceStyles.headerTitle}>{title}</Text>
          </View>
        </View>
        <ErrorView message={`ID ${title.toLowerCase()} tidak tersedia`} onRetry={() => router.back()} />
      </View>
    );
  }

  // Loading
  if (loading) {
    return (
      <View style={referenceStyles.container}>
        <View style={safeHeader}>
          <View style={referenceStyles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={referenceStyles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={theme.colors.textOnPrimary} />
            </TouchableOpacity>
            <Text style={referenceStyles.headerTitle}>{title}</Text>
          </View>
        </View>
        <View style={referenceStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={referenceStyles.loadingText}>Memuat {title.toLowerCase()}...</Text>
        </View>
      </View>
    );
  }

  // Error
  if (error) {
    return (
      <View style={referenceStyles.container}>
        <View style={safeHeader}>
          <View style={referenceStyles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={referenceStyles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={theme.colors.textOnPrimary} />
            </TouchableOpacity>
            <Text style={referenceStyles.headerTitle}>{title}</Text>
          </View>
        </View>
        <ErrorView message={error} onRetry={onRetry} />
      </View>
    );
  }

  // Success — caller renders content
  return null;
}

// ─── TabBar (shared tab selector) ─────────────────────────────

interface Tab {
  key: string;
  label: string;
  icon: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
}

/**
 * Gray-background tab bar with blue active state, icon + label per tab.
 * Used in activities/detail, trainings/detail, graduations/detail, assessments/detail.
 */
export function TabBar({ tabs, activeKey, onChange }: TabBarProps) {
  return (
    <View style={tabStyles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[tabStyles.tab, activeKey === tab.key && tabStyles.active]}
          onPress={() => onChange(tab.key)}
        >
          <Ionicons
            name={safeIconName(tab.icon)}
            size={14}
            color={activeKey === tab.key ? theme.colors.textOnPrimary : theme.colors.textSecondary}
          />
          <Text style={[tabStyles.label, activeKey === tab.key && tabStyles.activeLabel]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceMuted,
    margin: theme.spacing.lg,
    marginBottom: 0,
    borderRadius: theme.radius.md + 2,
    padding: theme.spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm + 1,
    borderRadius: theme.radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  active: { backgroundColor: theme.colors.primary },
  label: { fontSize: theme.typography.size.xs, fontWeight: theme.typography.weight.semibold, color: theme.colors.textMuted },
  activeLabel: { color: theme.colors.textOnPrimary },
});

// ─── Merged shell styles (used by ScreenShell) ──────────────────

const shellStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    backgroundColor: theme.colors.header,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  headerDetail: {
    padding: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
  },
  headerReference: {
    paddingBottom: theme.spacing.md + 2,
    paddingHorizontal: theme.spacing.lg,
  },
  backBtn: { padding: theme.spacing.xs },
  headerTitle: {
    color: theme.colors.textOnPrimary,
    fontSize: theme.typography.size.lg,
    fontWeight: theme.typography.weight.bold,
    flex: 1,
  },
  headerBadge: {
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs - 1,
    borderRadius: theme.radius.sm,
    alignSelf: 'center',
  },
  headerBadgeText: { fontSize: theme.typography.size.xs, fontWeight: theme.typography.weight.semibold },
  refreshBtn: { padding: theme.spacing.xs },
  scroll: { flex: 1 },
});

// ─── Shared reference-detail styles ─────────────────────────

export const referenceStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { backgroundColor: theme.colors.header, paddingTop: theme.spacing.xxxl + theme.spacing.xxl - 2, paddingBottom: theme.spacing.md + 2, paddingHorizontal: theme.spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  backBtn: { padding: theme.spacing.xs },
  headerTitle: { color: theme.colors.textOnPrimary, fontSize: theme.typography.size.lg, fontWeight: theme.typography.weight.bold },
  refreshBtn: { padding: theme.spacing.xs },
  scroll: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: theme.spacing.md, fontSize: theme.typography.size.md, color: theme.colors.textSecondary },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.sm + 2,
  },
  infoLabel: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted, textTransform: 'uppercase' },
  infoValue: { fontSize: theme.typography.size.md, color: theme.colors.text, fontWeight: theme.typography.weight.medium },
  sectionTitle: { fontSize: 15, fontWeight: theme.typography.weight.semibold, color: theme.colors.text, marginBottom: theme.spacing.md },
  // Section card (white card with shadow) — shared by all reference screens
  cardSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md + 2,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  // Status card (header variant) styles
  statusHeader: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md + 2,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  statusIconBox: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { fontSize: theme.typography.size.lg, fontWeight: theme.typography.weight.bold, color: theme.colors.text },
  badgeContainer: { alignSelf: 'flex-start', paddingHorizontal: theme.spacing.sm + 2, paddingVertical: theme.spacing.xs - 1, borderRadius: theme.radius.sm, marginTop: theme.spacing.xs },
  badgeText: { fontSize: theme.typography.size.xs, fontWeight: theme.typography.weight.semibold },
  idText: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted, fontFamily: 'monospace', marginTop: theme.spacing.sm - 2 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm - 2, marginTop: theme.spacing.sm - 2 },
  timelineText: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
  // Status card (centered variant) styles
  statusCardCentered: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xxl,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statusIconBoxCentered: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  statusTitleCentered: { fontSize: theme.typography.size.lg, fontWeight: theme.typography.weight.bold, color: theme.colors.text, textAlign: 'center' },
  statusSubtitle: { fontSize: theme.typography.size.md, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  // Profile card styles
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xxl,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarText: { fontSize: theme.typography.size.xxl, fontWeight: theme.typography.weight.bold, color: theme.colors.primary },
  name: { fontSize: theme.typography.size.xl, fontWeight: theme.typography.weight.bold, color: theme.colors.text, textAlign: 'center' },
  statusBadge: { paddingHorizontal: theme.spacing.md + 2, paddingVertical: 5, borderRadius: theme.radius.md, marginTop: theme.spacing.sm },
  statusText: { fontSize: theme.typography.size.sm, fontWeight: theme.typography.weight.semibold },
  rantingText: { fontSize: 13, color: theme.colors.textSecondary, marginTop: theme.spacing.sm - 2 },
});

const styles = StyleSheet.create({
  backBtn: {
    position: 'absolute' as const,
    left: theme.spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    zIndex: 999,
    elevation: 6,
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xxl,
  },
  message: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.size.md,
    color: theme.colors.textSecondary,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontSize: 15,
    color: theme.colors.danger,
    fontWeight: theme.typography.weight.medium,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.sm + 2,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
  },
  retryText: {
    color: theme.colors.textOnPrimary,
    fontSize: theme.typography.size.md,
    fontWeight: theme.typography.weight.semibold,
  },
  badge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: theme.typography.size.xs,
    fontWeight: theme.typography.weight.semibold,
  },
  filterRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md + 2,
    paddingVertical: theme.spacing.sm - 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySofter,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weight.semibold,
  },
  filterTextActive: {
    color: theme.colors.textOnPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.lg,
    marginBottom: 0,
    borderRadius: theme.radius.md + 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md + 2,
    paddingVertical: theme.spacing.sm + 2,
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.size.md,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
});
