import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import type { AddSourceResult } from '@/services/contracts';

export function AddSourceFeedback({ result }: { result: AddSourceResult }) {
  return (
    <View style={styles.content}>
      {result.processingCount ? (
        <Text selectable variant="bodyMedium">
          {formatProcessingMessage(result.processingCount)}
        </Text>
      ) : null}
      {result.matchedLocations.length ? (
        <View style={styles.content}>
          <Text selectable variant="labelLarge">
            Matched locations
          </Text>
          {result.matchedLocations.map((location) => (
            <Text selectable key={location.id} variant="bodyMedium">
              {location.name || 'Untitled location'}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function formatProcessingMessage(count: number) {
  return `${count} ${count === 1 ? 'location is' : 'locations are'} being processed.`;
}

const styles = StyleSheet.create({
  content: {
    gap: 8,
  },
});
