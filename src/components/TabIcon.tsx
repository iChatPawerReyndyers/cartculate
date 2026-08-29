// TabIcon.tsx
// Line icons for the bottom tab bar (App.tsx). Built with react-native-svg
// directly rather than an icon font library (react-native-vector-icons,
// @expo/vector-icons, etc.) since none is installed and react-native-svg
// already is (used by the Insights bar charts) - no new dependency, no
// native linking/font asset setup needed. Paths are simple hand-picked
// line-icon shapes (cart, open book, bar chart, price tag, history clock)
// on a 24x24 viewBox, colorable via the `color` prop so the tab bar can
// pass the same active/inactive colors it already uses for the label text.

import React from 'react';
import Svg, { Path, Circle, Line } from 'react-native-svg';

export type TabIconName = 'cart' | 'recipes' | 'insights' | 'pricing' | 'history';

interface TabIconProps {
  name: TabIconName;
  color: string;
  size?: number;
}

export default function TabIcon({ name, color, size = 22 }: TabIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'cart':
      return (
        <Svg {...common}>
          <Circle cx="9" cy="21" r="1" />
          <Circle cx="20" cy="21" r="1" />
          <Path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </Svg>
      );
    case 'recipes':
      return (
        <Svg {...common}>
          <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </Svg>
      );
    case 'insights':
      return (
        <Svg {...common}>
          <Line x1="18" y1="20" x2="18" y2="10" />
          <Line x1="12" y1="20" x2="12" y2="4" />
          <Line x1="6" y1="20" x2="6" y2="14" />
        </Svg>
      );
    case 'pricing':
      return (
        <Svg {...common}>
          <Path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <Line x1="7" y1="7" x2="7.01" y2="7" />
        </Svg>
      );
    case 'history':
      return (
        <Svg {...common}>
          <Path d="M3 3v5h5" />
          <Path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
          <Path d="M12 7v5l4 2" />
        </Svg>
      );
    default:
      return null;
  }
}