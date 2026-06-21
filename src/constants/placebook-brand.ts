import { Platform } from 'react-native';

export const PLACEBOOK_RED = '#FF385C';
export const PLACEBOOK_WHITE = '#FFFFFF';

export const placebookWordmarkFont = {
  fontFamily: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif-medium',
    default: 'Avenir Next Rounded, Avenir Next, Nunito Sans, Inter, Arial Rounded MT Bold, sans-serif',
  }),
  fontWeight: '800' as const,
  letterSpacing: 0,
};
