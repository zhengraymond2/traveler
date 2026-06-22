import { router, useFocusEffect } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, useTheme } from 'react-native-paper';

import { useAuth } from '@/auth';
import { MapRegionSearch } from '@/components/map-region-search';
import { WorldMap, type WorldMapHandle } from '@/components/world-map';
import { MapControlLayout } from '@/constants/map';
import { AppColors } from '@/constants/theme';
import { buildMapRegionSearchOptions, type MapRegionSearchOption } from '@/data/map-region-search-options';
import type { LocationWithPhotos } from '@/db/repository';
import { useServices } from '@/services/app-services';

export default function MapScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { savedLocationsReader } = useServices();
  const mapRef = React.useRef<WorldMapHandle>(null);
  const [locations, setLocations] = React.useState<LocationWithPhotos[]>([]);
  const regionSearchOptions = React.useMemo(() => buildMapRegionSearchOptions(locations), [locations]);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      async function loadLocations() {
        try {
          const savedLocations = await savedLocationsReader.listLocationsWithPhotos();
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
    }, [savedLocationsReader])
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.map}>
        <WorldMap ref={mapRef} locations={locations} />
        <MapRegionSearch options={regionSearchOptions} onSelect={handleSelectRegionSearchOption} />
        <Pressable
          accessibilityLabel="Open profile"
          accessibilityRole="button"
          hitSlop={12}
          style={({ pressed }) => [
            styles.profileButton,
            {
              opacity: pressed ? 0.82 : 1,
            },
          ]}
          onPress={() => router.push('/profile')}
        >
          {user ? (
            <Avatar.Text size={44} label={user.initials} style={styles.profileAvatar} labelStyle={styles.profileAvatarLabel} />
          ) : (
            <Avatar.Icon size={44} icon="account" style={styles.profileAvatar} color={AppColors.onPrimary} />
          )}
        </Pressable>
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
          <View testID="current-location-glyph" style={styles.locationGlyph}>
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
          testID="add-source-button"
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

  function handleSelectRegionSearchOption(option: MapRegionSearchOption) {
    if (!option.center) {
      return;
    }

    mapRef.current?.moveToSearchResult(option.center, option.zoomLevel, option.locationId);
  }
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
    right: 10,
    bottom: 90,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    boxShadow: `0 8px 22px ${AppColors.shadow}`,
  },
  profileButton: {
    position: 'absolute',
    top: 64,
    left: 16,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    boxShadow: `0 7px 18px ${AppColors.shadow}`,
  },
  profileAvatar: {
    backgroundColor: AppColors.primary,
  },
  profileAvatarLabel: {
    color: AppColors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  locationButton: {
    position: 'absolute',
    top: MapControlLayout.navTop,
    right: MapControlLayout.right,
    width: MapControlLayout.size,
    height: MapControlLayout.size,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MapControlLayout.size / 2,
    backgroundColor: AppColors.mapUserLocation,
    boxShadow: `0 7px 18px ${AppColors.shadow}`,
  },
  locationGlyph: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationGlyphRing: {
    width: 17,
    height: 17,
    borderWidth: 2,
    borderRadius: 8.5,
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
    height: 7,
  },
  locationGlyphRight: {
    right: 0,
    width: 7,
    height: 2,
  },
  locationGlyphBottom: {
    bottom: 0,
    width: 2,
    height: 7,
  },
  locationGlyphLeft: {
    left: 0,
    width: 7,
    height: 2,
  },
  addButtonText: {
    marginTop: -2,
    fontSize: 36,
    fontWeight: '300',
    lineHeight: 40,
  },
});
