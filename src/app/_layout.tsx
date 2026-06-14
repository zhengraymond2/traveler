import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';

import { paperTheme } from '@/constants/paper-theme';
import { DatabaseProvider } from '@/db/database-provider';

export default function RootLayout() {
  return (
    <PaperProvider theme={paperTheme}>
      <DatabaseProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="add-source" options={{ presentation: 'modal', title: 'Add Source' }} />
        </Stack>
      </DatabaseProvider>
    </PaperProvider>
  );
}
