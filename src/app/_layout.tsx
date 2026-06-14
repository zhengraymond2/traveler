import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { StyleSheet } from 'react-native';

import { paperTheme } from '@/constants/paper-theme';
import { DatabaseProvider } from '@/db/database-provider';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <PaperProvider theme={paperTheme}>
        <DatabaseProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="add-source" options={{ presentation: 'modal', title: 'Add Source' }} />
          </Stack>
        </DatabaseProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
