import { router, Stack } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';

import { buildShareIntakeLog, loadExpoSharingModule, type ExpoSharingModule } from '@/features/share/share-intake';

const expoSharing = loadExpoSharingModule();

export default function HandleShareScreen() {
  if (!expoSharing) {
    return <MissingExpoSharingScreen />;
  }

  return <AvailableExpoSharingScreen sharing={expoSharing} />;
}

function AvailableExpoSharingScreen({ sharing }: { sharing: ExpoSharingModule }) {
  const theme = useTheme();
  const { isResolving, resolvedSharedPayloads, sharedPayloads } = sharing.useIncomingShare();
  const hasLoggedShareRef = React.useRef(false);

  React.useEffect(() => {
    if (isResolving || hasLoggedShareRef.current) {
      return;
    }

    hasLoggedShareRef.current = true;
    console.log('Traveler received shared content', buildShareIntakeLog(sharedPayloads, resolvedSharedPayloads));
    sharing.clearSharedPayloads();
    router.replace('/(tabs)/saved');
  }, [isResolving, resolvedSharedPayloads, sharedPayloads, sharing]);

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

function MissingExpoSharingScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: 'Import shared content' }} />
      <Text selectable variant="titleMedium" style={{ color: theme.colors.onSurface }}>
        Sharing is not available in this build.
      </Text>
      <Text selectable variant="bodyMedium" style={[styles.fallbackText, { color: theme.colors.onSurfaceVariant }]}>
        Rebuild the native app after installing expo-sharing to receive content from other apps.
      </Text>
      <Button mode="contained" onPress={() => router.replace('/(tabs)/saved')}>
        Back to Saved
      </Button>
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
  fallbackText: {
    textAlign: 'center',
  },
});
