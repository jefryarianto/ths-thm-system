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
  primarySofter: '#eff6ff',
  primaryGradient: ['#2563eb', '#1d4ed8'] as [string, string],

  // Grayscale / neutral
  background: '#f6f7fb',
  surface: '#ffffff',
  surfaceMuted: '#f3f4f6',
  border: '#e5e7eb',
  borderStrong: '#d1d5db',

  // Teks
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textOnPrimary: '#ffffff',

  // Status / semantik
  success: '#059669',
  successLight: '#d1fae5',
  warning: '#d97706',
  warningLight: '#fef3c7',
  danger: '#dc2626',
  dangerLight: '#fee2e2',
  info: '#0891b2',
  infoLight: '#cffafe',

  // Header (biru grafis modern dengan aksen translusen)
  header: '#2563eb',
  headerSub: '#bfdbfe',

  // Overlay / dark
  overlay: 'rgba(15,23,42,0.55)',
  dark: '#0f172a',
} as const;

/** Skala spacing (8pt grid). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Radius sudut. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
  round: 999,
} as const;

/** Skala tipografi. */
export const typography = {
  size: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
    display: 30,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

/** Bayangan kartu secara lintas-platform. */
export const shadow = {
  card: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  } as const,
  raised: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  } as const,
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadow,
} as const;

export default theme;
