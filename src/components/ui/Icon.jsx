import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme/opengym';

/**
 * Stroke icons from the Fitsera redesign (24×24 grid, 1.75 stroke).
 * Each entry renders its children inside the shared <Svg>.
 */
const ICONS = {
  home: <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  train: <Path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />,
  eat: <Path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-1.7 0-3 2-3 5s1.3 4 3 4v9" />,
  gym: <Path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3" />,
  profile: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </>
  ),
  sliders: (
    <>
      <Path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <Circle cx="16" cy="7" r="2" />
      <Circle cx="10" cy="17" r="2" />
    </>
  ),
  back: <Path d="m15 6-6 6 6 6" />,
  chevron: <Path d="m9 6 6 6-6 6" />,
  close: <Path d="M6 6l12 12M18 6 6 18" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  minus: <Path d="M5 12h14" />,
  water: <Path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  book: <Path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" />,
  leaf: <Path d="M5 21c0-9 5-15 14-16-1 9-6 14-14 16zM5 21l7-7" />,
  edit: (
    <>
      <Path d="M4 20h4L19 9l-4-4L4 16z" />
      <Path d="m13.5 6.5 4 4" />
    </>
  ),
  camera: (
    <>
      <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <Circle cx="12" cy="13" r="3" />
    </>
  ),
  lock: (
    <>
      <Rect x="5" y="10" width="14" height="11" rx="2" />
      <Path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  qr: <Path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2h-2z" />,
  check: <Path d="m5 12.5 4.5 4.5L19 7.5" />,
  search: (
    <>
      <Circle cx="11" cy="11" r="6.5" />
      <Path d="m16 16 4.5 4.5" />
    </>
  ),
  trash: <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  bell: <Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0" />,
  info: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 11v5M12 8h.01" />
    </>
  ),
  flame: <Path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5.5C10 10 11 11 12 11c0-3-1-5.5 0-8z" />,
  calendar: (
    <>
      <Rect x="4" y="5" width="16" height="16" rx="2" />
      <Path d="M8 3v4M16 3v4M4 10h16" />
    </>
  ),
};

export function Icon({ name, size = 20, color = colors.label, strokeWidth = 1.75 }) {
  if (name === 'play') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z" />
      </Svg>
    );
  }
  const glyph = ICONS[name];
  if (!glyph) return null;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {glyph}
    </Svg>
  );
}

export default Icon;
