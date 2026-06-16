import { router, useFocusEffect } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';

import { WorldMap, type WorldMapHandle } from '@/components/world-map';
import { AppColors } from '@/constants/theme';
import { useDatabase } from '@/db/database-provider';
import type { LocationWithPhotos } from '@/db/repository';

export default function MapScreen() {
  const theme = useTheme();
  const { reader } = useDatabase();
  const mapRef = React.useRef<WorldMapHandle>(null);
  const [locations, setLocations] = React.useState<LocationWithPhotos[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      async function loadLocations() {
        try {
          const savedLocations = await reader.listLocationsWithPhotos();
          if (isActive) {
            setLocations(savedLocations);
          }
        } catch {
          if (isActive) {
            setLocations([]);
          }
        }
      }

      loadLocations();

      return () => {
        isActive = false;
      };
    }, [reader])
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.map}>
        <WorldMap ref={mapRef} locations={locations} />
        <Pressable
          accessibilityLabel="Center on current location"
          accessibilityRole="button"
          hitSlop={12}
          style={({ pressed }) => [
            styles.locationButton,
            {
              opacity: pressed ? 0.82 : 1,
            },
          ]}
          onPress={() => {
            void mapRef.current?.moveToUserLocation();
          }}
        >
          <View style={styles.locationGlyph}>
            <View style={styles.locationGlyphRing} />
            <View style={[styles.locationGlyphLine, styles.locationGlyphTop]} />
            <View style={[styles.locationGlyphLine, styles.locationGlyphRight]} />
            <View style={[styles.locationGlyphLine, styles.locationGlyphBottom]} />
            <View style={[styles.locationGlyphLine, styles.locationGlyphLeft]} />
          </View>
        </Pressable>
        <Pressable
          accessibilityLabel="Add source"
          accessibilityRole="button"
          hitSlop={12}
          style={({ pressed }) => [
            styles.addButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: pressed ? 0.82 : 1,
            },
          ]}
          onPress={() => router.push('/add-source')}
        >
          <Text style={[styles.addButtonText, { color: theme.colors.onPrimary }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 84,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    boxShadow: `0 8px 22px ${AppColors.shadow}`,
  },
  locationButton: {
    position: 'absolute',
    right: 27,
    bottom: 156,
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: AppColors.mapUserLocation,
    boxShadow: `0 7px 18px ${AppColors.shadow}`,
  },
  locationGlyph: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationGlyphRing: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderRadius: 7,
    borderColor: AppColors.onPrimary,
  },
  locationGlyphLine: {
    position: 'absolute',
    backgroundColor: AppColors.onPrimary,
    borderRadius: 1,
  },
  locationGlyphTop: {
    top: 0,
    width: 2,
    height: 6,
  },
  locationGlyphRight: {
    right: 0,
    width: 6,
    height: 2,
  },
  locationGlyphBottom: {
    bottom: 0,
    width: 2,
    height: 6,
  },
  locationGlyphLeft: {
    left: 0,
    width: 6,
    height: 2,
  },
  addButtonText: {
    marginTop: -2,
    fontSize: 36,
    fontWeight: '300',
    lineHeight: 40,
  },
});
