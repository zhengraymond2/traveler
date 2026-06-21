import { router, Stack } from 'expo-router';
import { clearSharedPayloads, useIncomingShare } from 'expo-sharing';
import * as React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { buildShareIntakeLog } from '@/features/share/share-intake';

export default function HandleShareScreen() {
  const theme = useTheme();
  const { isResolving, resolvedSharedPayloads, sharedPayloads } = useIncomingShare();
  const hasLoggedShareRef = React.useRef(false);

  React.useEffect(() => {
    if (isResolving || hasLoggedShareRef.current) {
      return;
    }

    hasLoggedShareRef.current = true;
    console.log('Traveler received shared content', buildShareIntakeLog(sharedPayloads, resolvedSharedPayloads));
    clearSharedPayloads();
    router.replace('/(tabs)/saved');
  }, [isResolving, resolvedSharedPayloads, sharedPayloads]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: 'Import shared content' }} />
      <ActivityIndicator />
      <Text selectable variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        Processing shared content...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
});
