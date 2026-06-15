/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const AppColors = {
  primary: '#256f6c',
  onPrimary: '#ffffff',
  primaryContainer: '#d7f3ef',
  onPrimaryContainer: '#083f3d',
  secondary: '#c4572d',
  onSecondary: '#ffffff',
  secondaryContainer: '#ffdbcf',
  onSecondaryContainer: '#4a1706',
  tertiary: '#6f5aa7',
  onTertiary: '#ffffff',
  tertiaryContainer: '#e9ddff',
  onTertiaryContainer: '#26124f',
  background: '#fbfaf7',
  surface: '#fffbff',
  surfaceMuted: '#f3f4f6',
  surfacePressed: '#f6f6f6',
  surfaceVariant: '#e1e4da',
  imageFallback: '#e7ebe9',
  mapFallback: '#dfe9ef',
  text: '#111827',
  textInverse: '#ffffff',
  textSecondary: '#60646C',
  textMuted: '#6b7280',
  textSubtle: '#4b5563',
  bodyText: '#374151',
  outline: '#74796f',
  divider: '#ffffff',
  scrim: 'rgba(17, 24, 39, 0.78)',
  shadow: 'rgba(0, 0, 0, 0.24)',
  textShadow: 'rgba(0, 0, 0, 0.28)',
  imageTextSecondary: 'rgba(255, 255, 255, 0.9)',
  imageTextMuted: 'rgba(255, 255, 255, 0.78)',
  overlayTransparent: 'rgba(0,0,0,0)',
  overlaySoft: 'rgba(0,0,0,0.34)',
  overlayMedium: 'rgba(0,0,0,0.38)',
  overlayStrong: 'rgba(0,0,0,0.76)',
  overlayStronger: 'rgba(0,0,0,0.78)',
} as const;

export const Colors = {
  light: {
    text: AppColors.text,
    background: AppColors.background,
    backgroundElement: AppColors.surfaceMuted,
    backgroundSelected: AppColors.primaryContainer,
    textSecondary: AppColors.textSecondary,
    linkPrimary: AppColors.primary,
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    linkPrimary: AppColors.primaryContainer,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
