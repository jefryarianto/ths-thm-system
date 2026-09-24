/**
 * Tema desain terpusat untuk aplikasi mobile THS-THM.
 *
 * Semua layar sebaiknya merujuk ke sini (bukan hardcode warna) agar tampilan
 * konsisten, mudah dirawat, dan mudah diperbarui. Warna mengikuti skema modern
 * "indigo/blue professional" dengan aksen lembut dan kontras yang baik.
 */

/** Palet warna utama. */
export const colors = {
  // Brand / primary (biru profesional)
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#dbeafe',
  primaryLighter: '#93c5fd',
  primarySofter: '#eff6ff',
  primaryGradient: ['#2563eb', '#1d4ed8'] as [string, string],

  // Grayscale / neutral
  background: '#f6f7fb',
  surface: '#ffffff',
  surfaceMuted: '#f3f4f6',
  border: '#e5e7eb',
  borderStrong: '#d1d5db',
  borderFocus: '#1d4ed8',
  inputBorder: '#64748B',
  inputPlaceholder: '#64748B',

  // Teks
  text: '#0f172a',      // DEPRECATED: use textPrimary
  textPrimary: '#0f172a',
  textDark: '#111827',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textOnPrimary: '#ffffff',
  iconMuted: '#9ca3af',

  // Status / semantik
  success: '#059669',
  successLight: '#d1fae5',
  successDark: '#0f766e',
  warning: '#d97706',
  warningLight: '#fef3c7',
  danger: '#dc2626',
  dangerLight: '#fee2e2',
  info: '#0891b2',
  infoLight: '#cffafe',

  // DEPRECATED: consolidate to primary / primaryLight
  header: '#2563eb',
  headerSub: '#bfdbfe',
  dark: '#0f172a',
  loginPageBackground: '#F0F2F5',

  // Overlay / dark
  overlay: 'rgba(15,23,42,0.55)',
} as const;

/** Skala spacing (4pt grid). */
export const spacing = {
  0: 0,
  1: 2,
  2: 4,
  3: 6,
  4: 8,
  5: 10,
  6: 12,
  7: 14,
  8: 16,
  9: 18,
  10: 20,
  11: 22,
  12: 24,
  14: 28,
  16: 32,
  20: 40,
  24: 48,
  // Semantic aliases
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 32,
  sectionLg: 40,
  sectionXl: 48,
} as const;

/** Radius sudut. */
export const radius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,
  pill: 999,
  round: 999,
} as const;

/** Skala tipografi dengan line height dan letter spacing. */
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  } as const,
  // Semantic scale dengan line height dan letter spacing
  display: { size: 32, lineHeight: 40, weight: '700' as const, letterSpacing: 0.5 },
  h1: { size: 28, lineHeight: 36, weight: '700' as const, letterSpacing: 0.3 },
  h2: { size: 24, lineHeight: 32, weight: '700' as const, letterSpacing: 0.2 },
  h3: { size: 20, lineHeight: 28, weight: '600' as const, letterSpacing: 0.1 },
  h4: { size: 18, lineHeight: 26, weight: '600' as const },
  bodyLg: { size: 16, lineHeight: 24, weight: '400' as const },
  body: { size: 14, lineHeight: 22, weight: '400' as const },
  bodySm: { size: 12, lineHeight: 18, weight: '400' as const },
  label: { size: 13, lineHeight: 20, weight: '600' as const },
  caption: { size: 11, lineHeight: 16, weight: '400' as const },
  button: { size: 16, lineHeight: 20, weight: '700' as const, letterSpacing: 0.3 },
  // Legacy size tokens (untuk migrasi)
  size: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
    display: 32,
  } as const,
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  } as const,
} as const;

/** Bayangan / elevation. */
export const shadow = {
  none: { shadowOpacity: 0, elevation: 0 },
  xs: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sm: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.10,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  xl: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  card: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  button: {
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonPressed: {
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  inputFocus: {
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadow,
} as const;

export default theme;
