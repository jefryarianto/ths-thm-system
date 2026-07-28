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

interface LoadingViewProps {
  message?: string;
}

export function LoadingView({ message = 'Memuat...' }: LoadingViewProps) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#2563eb" />
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
      <Ionicons name="search" size={16} color="#9ca3af" />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        value={value}
        onChangeText={onChangeText}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={16} color="#9ca3af" />
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
      <Ionicons name={icon as any} size={16} color="#2563eb" /> {text}
    </Text>
  );
}

export function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={referenceStyles.infoRow}>
      <Ionicons name={icon as any} size={15} color="#9ca3af" />
      <View style={{ flex: 1 }}>
        <Text style={referenceStyles.infoLabel}>{label}</Text>
        <Text style={referenceStyles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Helpers (used by StatusCard) ────────────────────────────────

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtDateTime(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
          <Ionicons name={icon as any} size={32} color={color} />
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
          <Ionicons name={icon as any} size={28} color={color} />
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
          <Ionicons name="calendar-outline" size={13} color="#9ca3af" />
          <Text style={referenceStyles.timelineText}>Diajukan {fmtDate(createdAt)}</Text>
        </View>
      )}
      {updatedAt && (
        <View style={referenceStyles.timelineRow}>
          <Ionicons name="refresh-outline" size={13} color="#9ca3af" />
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
  return (
    <View style={shellStyles.container}>
      <View style={[shellStyles.header, variant === 'detail' ? shellStyles.headerDetail : shellStyles.headerReference]}>
        <TouchableOpacity onPress={() => router.back()} style={shellStyles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
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
            <Ionicons name="refresh" size={20} color="#bfdbfe" />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView style={shellStyles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
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
  // ID guard
  if (!id) {
    return (
      <View style={referenceStyles.container}>
        <View style={referenceStyles.header}>
          <View style={referenceStyles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={referenceStyles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
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
        <View style={referenceStyles.header}>
          <View style={referenceStyles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={referenceStyles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={referenceStyles.headerTitle}>{title}</Text>
          </View>
        </View>
        <View style={referenceStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={referenceStyles.loadingText}>Memuat {title.toLowerCase()}...</Text>
        </View>
      </View>
    );
  }

  // Error
  if (error) {
    return (
      <View style={referenceStyles.container}>
        <View style={referenceStyles.header}>
          <View style={referenceStyles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={referenceStyles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
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
            name={tab.icon as any}
            size={14}
            color={activeKey === tab.key ? '#fff' : '#6b7280'}
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
    backgroundColor: '#e5e7eb',
    margin: 16,
    marginBottom: 0,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  active: { backgroundColor: '#2563eb' },
  label: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  activeLabel: { color: '#fff' },
});

// ─── Merged shell styles (used by ScreenShell) ──────────────────

const shellStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerDetail: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerReference: {
    paddingTop: 54,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  headerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'center',
  },
  headerBadgeText: { fontSize: 11, fontWeight: '600' },
  refreshBtn: { padding: 4 },
  scroll: { flex: 1 },
});

// ─── Shared reference-detail styles ─────────────────────────

export const referenceStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#2563eb', paddingTop: 54, paddingBottom: 14, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  refreshBtn: { padding: 4 },
  scroll: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
  },
  infoLabel: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 12 },
  // Section card (white card with shadow) — shared by all reference screens
  cardSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  // Status card (header variant) styles
  statusHeader: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  badgeContainer: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  idText: { fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', marginTop: 6 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  timelineText: { fontSize: 12, color: '#6b7280' },
  // Status card (centered variant) styles
  statusCardCentered: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
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
    marginBottom: 12,
  },
  statusTitleCentered: { fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center' },
  statusSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  // Profile card styles
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#2563eb' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, marginTop: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  rantingText: { fontSize: 13, color: '#6b7280', marginTop: 6 },
});

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 24,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 15,
    color: '#dc2626',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    marginLeft: 8,
  },
});
