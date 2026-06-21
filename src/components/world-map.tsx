import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppColors } from '@/constants/theme';
import type { LocationWithPhotos } from '@/db/repository';

type WorldMapProps = {
  locations?: LocationWithPhotos[];
};

export type WorldMapHandle = {
  moveToSearchResult: (coordinate: MapCoordinate, zoomLevel?: number) => boolean;
  moveToUserLocation: () => Promise<boolean>;
};

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export const WorldMap = React.forwardRef<WorldMapHandle, WorldMapProps>(function WorldMap(_props, ref) {
  React.useImperativeHandle(
    ref,
    () => ({
      moveToSearchResult: () => false,
      moveToUserLocation: async () => false,
    }),
    []
  );

  return (
    <View style={styles.fallback}>
      <Text selectable variant="bodyMedium" style={styles.fallbackText}>
        Mapbox renders in native builds.
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.mapFallback,
    padding: 24,
  },
  fallbackText: {
    color: AppColors.textSubtle,
    textAlign: 'center',
  },
});
