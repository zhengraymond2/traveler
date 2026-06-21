import { router, Stack } from 'expo-router';
import { clearSharedPayloads, useIncomingShare } from 'expo-sharing';
import * as React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { useServices } from '@/services/app-services';
import { buildAddSourceInputsFromSharedPayloads, buildShareIntakeLog } from '@/features/share/share-intake';

export default function HandleShareScreen() {
  const theme = useTheme();
  const { isResolving, resolvedSharedPayloads, sharedPayloads } = useIncomingShare();
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
      clearSharedPayloads();
      router.replace('/(tabs)/saved');
    }
  }, [locationIntakeService, resolvedSharedPayloads, sharedPayloads]);

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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
});
