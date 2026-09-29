export const colors = {
  background: '#F7F4EE',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF3EF',
  primary: '#8EA899',
  primaryStrong: '#305B4C',
  primarySoft: '#DDE8E1',
  sky: '#E1EDF2',
  peach: '#FBE0C6',
  lavender: '#E6DCEC',
  sand: '#F2EBDD',
  coral: '#FF8F78',
  text: '#263631',
  textMuted: '#64746E',
  border: '#DCE5E0',
  danger: '#C95D58',
  dangerSoft: '#FCE5E2',
  warning: '#C78A43',
  warningSoft: '#FFF2DC',
  success: '#4F8069',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' as const },
  h1: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  h2: { fontSize: 19, lineHeight: 25, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
} as const;
