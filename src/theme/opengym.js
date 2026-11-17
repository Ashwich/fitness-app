/**
 * openGym-inspired design tokens (dark, iOS fitness aesthetic).
 * Accent default: lime green — not purple.
 */
export const colors = {
  bg: '#000000',
  bgEl: '#0e0e10',
  surface: '#1c1c1e',
  surface2: '#2c2c2e',
  surface3: '#3a3a3c',
  label: '#ffffff',
  label2: 'rgba(235,235,245,0.60)',
  label3: 'rgba(235,235,245,0.32)',
  label4: 'rgba(235,235,245,0.18)',
  sep: 'rgba(84,84,88,0.60)',
  accent: '#30d158',
  accentPressed: '#248a3d',
  onAccent: '#000000',
  accentSoft: 'rgba(48,209,88,0.16)',
  accentLine: 'rgba(48,209,88,0.38)',
  orange: '#ff9f0a',
  red: '#ff453a',
  blue: '#0a84ff',
  grey: '#8e8e93',
  purple: '#bf5af2',
  pink: '#ff375f',
  teal: '#64d2ff',
  redSoft: 'rgba(255,69,58,0.16)',
  orangeSoft: 'rgba(255,159,10,0.16)',
  blueSoft: 'rgba(10,132,255,0.16)',
  purpleSoft: 'rgba(191,90,242,0.16)',
  pinkSoft: 'rgba(255,55,95,0.16)',
  overlay: 'rgba(0,0,0,0.72)',
};

export const radii = {
  sm: 8,
  md: 12,
  card: 14,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const space = {
  pad: 16,
  cardGap: 12,
  section: 22,
};

export const typography = {
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.label,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.label,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.label,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: colors.label,
  },
  body: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.2,
    color: colors.label,
  },
  sub: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.label2,
  },
  foot: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.label3,
  },
  cap: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.label3,
  },
};
