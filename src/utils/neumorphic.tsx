// neumorphic.tsx
// Shared "soft-UI" design tokens + components, matching the reference
// neumorphic_component_library.html / neumorphic_line_graph.html mockups.
//
// WHY THIS NEEDS A LIBRARY: plain React Native cannot render the
// literal look those HTML mockups use - CSS's
//   box-shadow: 5px 5px 10px darkColor, -5px -5px 10px lightColor
// draws TWO colored shadows on the SAME element at once. RN's native
// shadow props (shadowColor/shadowOffset/shadowOpacity/shadowRadius) only
// support ONE shadow per element, and Android's native renderer ignores
// all of those anyway - it only reads `elevation`, which is a fixed gray
// shadow with no offset/color control.
//
// react-native-shadow-2 (https://www.npmjs.com/package/react-native-shadow-2)
// solves this by drawing shadows as SVG instead of relying on the native
// shadow APIs. NeumoRaised below nests TWO <Shadow> wrappers (one dark
// shadow offset down-right, one light shadow offset up-left) around the
// same surface to reproduce the dual-shadow look.
//
// BUGFIX (fullWidth prop): <Shadow> sizes itself to fit its CHILDREN, not
// to whatever width its own parent would otherwise hand it - unlike a
// plain RN <View>, it does NOT automatically stretch to fill a flex
// parent's cross-axis. That's why cards built on NeumoRaised were
// rendering narrower than the row they were placed in (a visible gap on
// the right edge) even though the surrounding screen padding looked
// correct. Card-level usages now explicitly pass `fullWidth` so both
// Shadow layers AND the inner surface stretch to 100% of their parent;
// small fixed-size elements (steppers, icon buttons, pills) leave
// `fullWidth` off (the default) so they keep sizing to their content as
// before - forcing 100% width on those would blow them up to fill their
// row instead of staying compact.
//
// True INSET ("pressed in") shadows are still not supported by this
// (or any lightweight) RN library - NeumoInset approximates it with a
// darker fill + a soft inward-facing border tint. Because it's a plain
// RN <View> (not Shadow-wrapped), it DOES already stretch to fill its
// parent by default (RN's normal flex behavior) - no fullWidth prop
// needed there.
//
// npm install react-native-shadow-2   <-- required for this file to work

import React from 'react';
import { View, ViewStyle, StyleProp, Platform, PixelRatio } from 'react-native';
import { Shadow } from 'react-native-shadow-2';

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
 * Real dual light+dark shadow via two nested <Shadow> layers (see the
 * file header comment for why this needs react-native-shadow-2 at all).
 */
export function NeumoRaised({
  children,
  style,
  borderRadius = neumo.radiusCard,
  distance = 8,
  fullWidth = false,
}: NeumoSurfaceProps) {
  const stretch: ViewStyle = fullWidth ? { alignSelf: 'stretch', width: '100%' } : {};
  return (
    <Shadow
      distance={distance}
      startColor={`${neumo.shadowDark}55`}
      offset={[distance / 2, distance / 2]}
      style={[{ borderRadius }, stretch]}
    >
      <Shadow
        distance={distance}
        startColor={`${neumo.shadowLight}CC`}
        offset={[-distance / 2, -distance / 2]}
        style={[{ borderRadius }, stretch]}
      >
        <View
          style={[
            { backgroundColor: neumo.surfaceRaised, borderRadius, overflow: 'hidden' },
            stretch,
            style,
          ]}
        >
          {children}
        </View>
      </Shadow>
    </Shadow>
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
 * background - the "+" stepper, primary CTA buttons.
 */
export function NeumoAccentRaised({
  children,
  style,
  borderRadius = neumo.radiusCard,
  distance = 6,
  fullWidth = false,
}: NeumoSurfaceProps) {
  const stretch: ViewStyle = fullWidth ? { alignSelf: 'stretch', width: '100%' } : {};
  return (
    <Shadow
      distance={distance}
      startColor={`${neumo.shadowDark}55`}
      offset={[distance / 2, distance / 2]}
      style={[{ borderRadius }, stretch]}
    >
      <View style={[{ backgroundColor: neumo.accent, borderRadius, overflow: 'hidden' }, stretch, style]}>
        {children}
      </View>
    </Shadow>
  );
}

/** Base text style every neumorphic label should extend, for consistent font family/weight handling across platforms. */
export const neumoText = {
  heading: { fontFamily: neumoFontFamily, fontWeight: neumoFontWeight('700'), color: neumo.textPrimary },
  subheading: { fontFamily: neumoFontFamily, fontWeight: neumoFontWeight('600'), color: neumo.textPrimary },
  body: { fontFamily: neumoFontFamily, fontWeight: neumoFontWeight('400'), color: neumo.textPrimary },
  caption: { fontFamily: neumoFontFamily, fontWeight: neumoFontWeight('400'), color: neumo.textSecondary },
} as const;