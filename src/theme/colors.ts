// colors.ts
// Centralized color tokens for Cartculate's brand palette per the Master
// Technical Specification's Visual Identity section: "Fresh Mint Green
// (representing cash savings and fresh ingredients) blended with a warm
// Berry Red and Citrus Orange accent for a delicious, game-like look."
//
// Import these instead of hardcoding hex values in a component's
// StyleSheet, so the app can't drift back into scattered one-off colors.
// (Previously every screen hardcoded #4A90D9 blue as the "primary" color
// and #E53935 red for destructive actions - neither matched the spec's
// palette at all.)

export const colors = {
  // Primary - Fresh Mint Green (buttons, active states, totals, links)
  primary: '#2FAF7E',
  primaryDark: '#1F7A57',
  primaryLight: '#E3F7EC',
  primaryDisabled: '#A9DBC4',

  // Destructive - Berry Red (Master Reset, delete actions)
  berry: '#C0335A',
  berryDark: '#8A2740',
  berryLight: '#FBE4EA',

  // Accent - Citrus Orange (variance alerts, badges, "needs review")
  citrus: '#F2994A',
  citrusDark: '#8A5A1E',
  citrusLight: '#FFF1E0',

  // Neutrals - unchanged from before, these were never the problem.
  textPrimary: '#1A1A1A',
  textSecondary: '#757575',
  textMuted: '#9A9A9A',
  border: '#E0E0E0',
  borderStrong: '#D0D0D0',
  background: '#F5F5F0',
  surface: '#FFFFFF',
} as const;
