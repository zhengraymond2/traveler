import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppColors } from '@/constants/theme';
import type { LocationWithPhotos } from '@/db/repository';

type WorldMapProps = {
  locations?: LocationWithPhotos[];
};

export function WorldMap(_props: WorldMapProps) {
  return (
    <View style={styles.fallback}>
      <Text selectable variant="bodyMedium" style={styles.fallbackText}>
        Mapbox renders in native builds.
      </Text>
    </View>
  );
}

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
