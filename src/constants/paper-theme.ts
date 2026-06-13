import { MD3LightTheme } from 'react-native-paper';

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
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
    surfaceVariant: '#e1e4da',
    outline: '#74796f',
  },
};

export type PaperAppTheme = typeof paperTheme;
