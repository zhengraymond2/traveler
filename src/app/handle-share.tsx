import { router, Stack } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';

import { useServices } from '@/services/app-services';
import {
  buildAddSourceInputsFromSharedPayloads,
  buildShareIntakeLog,
  loadExpoSharingModule,
  type ExpoSharingModule,
} from '@/features/share/share-intake';

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
  const { locationIntakeService } = useServices();
  const hasLoggedShareRef = React.useRef(false);

  const processSharedPayloads = React.useCallback(async () => {
    const log = buildShareIntakeLog(sharedPayloads, resolvedSharedPayloads);
    const payloadsToProcess = resolvedSharedPayloads.length ? resolvedSharedPayloads : sharedPayloads;
    const addSourceInputs = buildAddSourceInputsFromSharedPayloads(payloadsToProcess);

    try {
      const results = await Promise.all(addSourceInputs.map((input) => locationIntakeService.addSource(input)));
      console.log('Traveler received shared content', { ...log, results });
    } catch (error) {
      console.error('Traveler failed to process shared content', error);
    } finally {
      sharing.clearSharedPayloads();
      router.replace('/(tabs)/countries');
    }
  }, [locationIntakeService, resolvedSharedPayloads, sharedPayloads, sharing]);

  React.useEffect(() => {
    if (isResolving || hasLoggedShareRef.current) {
      return;
    }

    hasLoggedShareRef.current = true;
    void processSharedPayloads();
  }, [isResolving, processSharedPayloads]);

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
      <Button mode="contained" onPress={() => router.replace('/(tabs)/countries')}>
        Back to Countries
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
