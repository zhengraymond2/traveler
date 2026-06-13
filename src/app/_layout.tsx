import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';

import { paperTheme } from '@/constants/paper-theme';

export default function RootLayout() {
  return (
    <PaperProvider theme={paperTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-source" options={{ presentation: 'modal', title: 'Add Source' }} />
      </Stack>
    </PaperProvider>
  );
}
