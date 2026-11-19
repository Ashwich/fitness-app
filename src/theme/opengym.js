/**
 * Fitsera design tokens — "Fitness App Redesign" (light, warm neutral, lime accent).
 *
 * Token names are kept from the previous dark theme so every screen picks the
 * new look up automatically:
 *   accent    = the primary action colour (ink #111 buttons with white text)
 *   lime      = highlight chips / badges / today markers (with ink text)
 */
export const FONT_FAMILY = 'Inter Tight';

export const colors = {
  // Ground and surfaces
  bg: '#F4F4F1',
  bgEl: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#F4F4F1', // inset tiles / stepper buttons inside white cards
  surface3: '#ECECE7', // progress tracks, empty bars
  bar: '#DADAD3', // past-day bars in charts
  ring: '#CFCFC8', // unselected radio ring, dashed borders, off switches

  // Text
  label: '#111111',
  label2: '#6B6B66',
  label3: '#8A8A84',
  label4: '#A3A39C',
  sep: '#ECECE7',
  border: '#E4E4DF',

  // Actions
  ink: '#111111',
  onInk: '#FFFFFF',
  inkMuted: '#B8B8B2', // secondary text on ink surfaces
  inkTrack: '#333330', // progress track on ink surfaces
  accent: '#111111',
  accentPressed: '#333330',
  onAccent: '#FFFFFF',
  accentSoft: '#D4F25A',
  accentLine: '#CFCFC8',
  lime: '#D4F25A',
  onLime: '#111111',
  limeDeep: '#2A2F12',

  // Status / semantic (darkened for contrast on light ground)
  orange: '#B54708',
  red: '#B42318',
  blue: '#175CD3',
  grey: '#8A8A84',
  purple: '#6E3FC4',
  pink: '#C11574',
  teal: '#0E7090',
  redSoft: '#FDECEA',
  orangeSoft: '#FEF0E1',
  blueSoft: '#E8F0FD',
  purpleSoft: '#F1ECFB',
  pinkSoft: '#FCE8F3',
  overlay: 'rgba(17,17,17,0.45)',
};

export const radii = {
  sm: 8,
  md: 12,
  card: 20,
  lg: 16,
  tile: 18,
  xl: 24,
  pill: 999,
};

export const space = {
  pad: 20,
  cardGap: 10,
  section: 20,
};

const t = (fontSize, fontWeight, color, extra = {}) => ({
  fontFamily: FONT_FAMILY,
  fontSize,
  fontWeight,
  color,
  ...extra,
});

export const typography = {
  display: t(64, '600', colors.label, { letterSpacing: -2.5, lineHeight: 64 }),
  largeTitle: t(32, '600', colors.label, { letterSpacing: -0.6 }),
  title: t(28, '600', colors.label, { letterSpacing: -0.5 }),
  title2: t(22, '600', colors.label),
  headline: t(17, '600', colors.label),
  body: t(16, '400', colors.label),
  row: t(15, '600', colors.label),
  sub: t(15, '400', colors.label2),
  meta: t(13, '400', colors.label2),
  section: t(13, '600', colors.label2),
  foot: t(13, '400', colors.label3),
  cap: t(12, '400', colors.label2),
};
