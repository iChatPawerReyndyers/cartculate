// neumorphic.tsx
// Shared "soft-UI" design tokens + components, matching the reference
// neumorphic_component_gallery.html / neumorphic_layout_accurate_preview.html
// mockups' literal CSS:
//   box-shadow: 5px 5px 9px darkColor, -5px -5px 9px lightColor
//
// NATIVE boxShadow, NOT react-native-shadow-2: NeumoRaised and
// NeumoAccentRaised used to build this dual shadow by nesting two
// <Shadow> layers from the react-native-shadow-2 library (an SVG-based
// workaround for older RN versions that could only render ONE native
// shadow per element, and only on iOS). That went through several
// rounds of real bugs - a `paintInside` default that painted a flat,
// unrounded box instead of a soft blur, then a visible gap between the
// card's edge and the shadow once that was fixed - each traceable to
// the SVG library's own canvas-sizing behavior.
//
// React Native 0.76 added a native, cross-platform `boxShadow` style
// property that implements the actual CSS box-shadow spec at the
// platform level (New Architecture only, which has been the default
// since 0.76 - this project is on 0.86, well within range). It takes
// the exact same comma-separated multi-shadow string as CSS, and is
// rendered by the platform rather than an SVG canvas.
//
// UNLIKE real CSS, RN's overflow:'hidden' DOES interfere with a
// boxShadow on the same element - this is a long-documented RN quirk
// (e.g. facebook/react-native#449), not something specific to this
// property. On web, overflow only clips child content and leaves an
// element's own box-shadow alone; in RN, the two compete over the same
// clip/paint boundary, which showed up here as a sharp, chopped corner
// instead of a smooth curve. NeumoRaised/NeumoAccentRaised below
// deliberately do NOT set overflow:'hidden' - RN already renders a
// View's own background rounded via borderRadius alone, no clipping
// needed for that; overflow:'hidden' is only for clipping CHILD content
// that pokes past the rounded edge, and if that's ever needed, it
// belongs on a separate inner wrapper, never on the same element as
// boxShadow. NeumoRaised/NeumoAccentRaised build the CSS string
// directly from the `distance` prop; no react-native-shadow-2 usage
// remains in either. The package is still listed in package.json
// (unused now) - safe to remove if nothing else in the app depends on
// it; NeumoBarChart.tsx was migrated the same way.
//
// True INSET ("pressed in") shadows aren't expressible via boxShadow
// either (CSS itself needs a separate `inset` keyword per shadow layer,
// which this RN property doesn't yet support) - NeumoInset still
// approximates it with a darker fill + a soft inward-facing border tint.

import React from 'react';
import { View, ViewStyle, StyleProp, Platform, PixelRatio } from 'react-native';

export const neumo = {
  background: '#E6EBF2',
  surfaceRaised: '#E6EBF2',
  surfaceInset: '#DEE4ED',

  shadowDark: '#A6B0C3',
  shadowLight: '#FFFFFF',

  // Kept as Cartculate's existing brand mint green rather than the
  // reference mockup's orange. Change to '#F5A623' here to match the
  // reference exactly - every screen pulls from this one constant.
  accent: '#2FAF7E',
  accentDark: '#1F7A57',

  danger: '#E0736F',
  dangerDark: '#B2453F',

  textPrimary: '#3A4358',
  textSecondary: '#8891A5',
  textMuted: '#B4BBCB',

  radiusCard: 16,
  radiusPill: 12,
  radiusSm: 9,
} as const;

/**
 * Cross-platform font family, matching the reference mockups' `-apple-system,
 * sans-serif` stack as closely as native RN allows: iOS's default IS San
 * Francisco (-apple-system's actual font), so 'System' is a direct match.
 * Android has no San Francisco equivalent - 'sans-serif' (Roboto) is the
 * closest neutral system default and avoids pulling in a licensed font file.
 */
export const neumoFontFamily = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });

/**
 * Android's system Roboto only ships true 400/500/700 weights - intermediate
 * values like '600' silently fall back to 400 (looking noticeably thinner
 * than intended), while iOS's San Francisco supports the full 100-900
 * range natively. This snaps any weight to the nearest one Android can
 * actually render, and passes iOS through unchanged.
 */
export function neumoFontWeight(weight: '400' | '500' | '600' | '700'): '400' | '500' | '700' {
  if (Platform.OS !== 'android') return weight === '600' ? '700' : weight;
  if (weight === '400') return '400';
  if (weight === '700' || weight === '600') return '700';
  return '500';
}

interface NeumoSurfaceProps {
  /** Optional - e.g. an empty "well" surface like an unchecked checkbox has no content of its own. */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  /** Shrinks both shadow layers proportionally - use for small controls (steppers, chips) vs full cards. */
  distance?: number;
  /**
   * Stretches the surface to 100% of its parent's width - turn this on
   * for cards/rows meant to span a list row or screen width. Leave off
   * (default) for buttons/steppers/icons that should size to their own
   * content instead of stretching to fill whatever row they sit in.
   */
  fullWidth?: boolean;
}

/**
 * The default soft-UI "popping off the background" surface - cards,
 * primary buttons, nav bars, the active pill inside a segmented toggle.
 * Real dual light+dark shadow via RN's native `boxShadow` style property
 * (New Architecture, RN 0.76+ - this project is on 0.86) - see file
 * header comment for why this replaced the react-native-shadow-2 layers
 * that used to be here.
 */
export function NeumoRaised({
  children,
  style,
  borderRadius = neumo.radiusCard,
  distance = 8,
  fullWidth = false,
}: NeumoSurfaceProps) {
  const stretch: ViewStyle = fullWidth ? { alignSelf: 'stretch', width: '100%' } : {};
  const offset = distance / 2;
  return (
    <View
      style={[
        {
          backgroundColor: neumo.surfaceRaised,
          borderRadius,
          // Deliberately NO overflow:'hidden' here - it isn't needed for
          // RN to render this View's own background rounded (borderRadius
          // alone does that), and combining overflow:'hidden' with
          // boxShadow on the same element is a long-documented RN quirk
          // (the two compete over the same paint/clip boundary) - that's
          // what was producing a chopped/sharp corner instead of a smooth
          // curve. If a child ever needs clipping to the rounded shape,
          // add overflow:'hidden' on a separate inner wrapper instead of
          // here, so it never shares an element with boxShadow.
          boxShadow: `${offset}px ${offset}px ${distance}px ${neumo.shadowDark}, ${-offset}px ${-offset}px ${distance}px ${neumo.shadowLight}`,
        } as ViewStyle,
        stretch,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * The "pressed in" soft-UI surface - text inputs, toggle tracks, the "-"
 * stepper button, the inactive side of a segmented control. Approximated
 * (no true inset-shadow support in RN - see file header) with a darker
 * fill and a subtle inward border tint rather than an actual shadow. This
 * is a plain <View>, so it already stretches to fill its parent by
 * default RN flex behavior - no fullWidth prop needed here.
 */
export function NeumoInset({ children, style, borderRadius = neumo.radiusCard }: NeumoSurfaceProps) {
  return (
    <View
      style={[
        {
          backgroundColor: neumo.surfaceInset,
          borderRadius,
          borderWidth: 1.5 / PixelRatio.get(),
          borderTopColor: 'rgba(120,129,150,0.55)',
          borderLeftColor: 'rgba(120,129,150,0.55)',
          borderBottomColor: 'rgba(255,255,255,0.65)',
          borderRightColor: 'rgba(255,255,255,0.65)',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * A raised surface filled with the accent color instead of the neutral
 * background - the "+" stepper, primary CTA buttons. Same dual-shadow
 * treatment as NeumoRaised, matching the reference gallery's Primary
 * button.
 */
export function NeumoAccentRaised({
  children,
  style,
  borderRadius = neumo.radiusCard,
  distance = 6,
  fullWidth = false,
}: NeumoSurfaceProps) {
  const stretch: ViewStyle = fullWidth ? { alignSelf: 'stretch', width: '100%' } : {};
  const offset = distance / 2;
  return (
    <View
      style={[
        {
          backgroundColor: neumo.accent,
          borderRadius,
          // See NeumoRaised's comment - deliberately no overflow:'hidden'
          // here, same chopped-corner reason.
          boxShadow: `${offset}px ${offset}px ${distance}px ${neumo.shadowDark}, ${-offset}px ${-offset}px ${distance}px ${neumo.shadowLight}`,
        } as ViewStyle,
        stretch,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Base text style every neumorphic label should extend, for consistent font family/weight handling across platforms. */
export const neumoText = {
  heading: { fontFamily: neumoFontFamily, fontWeight: neumoFontWeight('700'), color: neumo.textPrimary },
  subheading: { fontFamily: neumoFontFamily, fontWeight: neumoFontWeight('600'), color: neumo.textPrimary },
  body: { fontFamily: neumoFontFamily, fontWeight: neumoFontWeight('400'), color: neumo.textPrimary },
  caption: { fontFamily: neumoFontFamily, fontWeight: neumoFontWeight('400'), color: neumo.textSecondary },
} as const;