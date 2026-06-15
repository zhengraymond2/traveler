/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const AppColors = {
  primary: '#f45f66',
  onPrimary: '#ffffff',
  primaryContainer: '#ffe1e4',
  onPrimaryContainer: '#5b1118',
  secondary: '#b55b52',
  onSecondary: '#ffffff',
  secondaryContainer: '#ffded9',
  onSecondaryContainer: '#4b1712',
  tertiary: '#6f6f9f',
  onTertiary: '#ffffff',
  tertiaryContainer: '#e5e5ff',
  onTertiaryContainer: '#242449',
  background: '#fffafa',
  surface: '#ffffff',
  navBackground: 'rgba(255, 255, 255, 0.84)',
  navShadow: 'rgba(138, 116, 119, 0.2)',
  surfaceMuted: '#f7f2f2',
  surfacePressed: '#fff0f1',
  surfaceVariant: '#f1dedf',
  imageFallback: '#f3e8e7',
  mapFallback: '#f7eeee',
  text: '#211718',
  textInverse: '#ffffff',
  textSecondary: '#6f5f61',
  textMuted: '#7c6c6f',
  textSubtle: '#5b4b4e',
  bodyText: '#423438',
  outline: '#8a7477',
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
