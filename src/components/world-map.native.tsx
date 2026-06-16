import Mapbox from '@rnmapbox/maps';
import { Image } from 'expo-image';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppColors } from '@/constants/theme';
import type { LocationWithPhotos } from '@/db/repository';

const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (mapboxAccessToken) {
  Mapbox.setAccessToken(mapboxAccessToken);
}

type WorldMapProps = {
  locations?: LocationWithPhotos[];
};

export function WorldMap({ locations = [] }: WorldMapProps) {
  const locationDotShape = React.useMemo(() => createLocationDotShape(locations), [locations]);
  const sampledPinLocations = React.useMemo(() => sampleImagePinLocations(locations), [locations]);

  if (!mapboxAccessToken) {
    return (
      <View style={styles.fallback}>
        <Text selectable variant="bodyMedium" style={styles.fallbackText}>
          Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to show the map.
        </Text>
      </View>
    );
  }

  return (
    <Mapbox.MapView
      style={styles.map}
      styleURL={Mapbox.StyleURL.Light}
      projection="globe"
      compassEnabled={false}
      scaleBarEnabled={false}>
      <Mapbox.Camera
        centerCoordinate={[0, 20]}
        zoomLevel={0}
        minZoomLevel={0}
        animationMode="none"
      />
      {locationDotShape.features.length ? (
        <Mapbox.ShapeSource id="saved-location-dots" shape={locationDotShape}>
          <Mapbox.CircleLayer id="saved-location-dot-layer" style={mapLayerStyles.locationDot} />
        </Mapbox.ShapeSource>
      ) : null}
      {sampledPinLocations.map((location) => (
        <Mapbox.MarkerView
          key={location.id}
          allowOverlap={false}
          anchor={{ x: 0.5, y: 1 }}
          coordinate={[location.longitude, location.latitude]}>
          <View style={styles.photoPin}>
            <View style={styles.photoPinBubble}>
              <Image source={{ uri: location.photos[0].uri }} style={styles.photoPinImage} contentFit="cover" />
            </View>
            <View style={styles.photoPinTip} />
          </View>
        </Mapbox.MarkerView>
      ))}
    </Mapbox.MapView>
  );
}

function createLocationDotShape(locations: LocationWithPhotos[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: locations.filter(hasCoordinates).map((location) => ({
      type: 'Feature',
      id: location.id,
      properties: {
        id: location.id,
        name: location.name ?? 'Untitled location',
      },
      geometry: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      },
    })),
  };
}

function hasCoordinates(
  location: LocationWithPhotos
): location is LocationWithPhotos & { latitude: number; longitude: number } {
  return Number.isFinite(location.latitude) && Number.isFinite(location.longitude);
}

function hasPhotoAndCoordinates(
  location: LocationWithPhotos
): location is LocationWithPhotos & { latitude: number; longitude: number; photos: [{ uri: string }, ...LocationWithPhotos['photos']] } {
  return hasCoordinates(location) && location.photos.length > 0;
}

function sampleImagePinLocations(locations: LocationWithPhotos[]) {
  const candidates = locations.filter(hasPhotoAndCoordinates);
  const pinCount = Math.min(8, Math.ceil(candidates.length / 4));
  const locationsByCountry = new Map<string, typeof candidates>();

  for (const location of candidates) {
    const country = location.country?.trim() || 'Unknown';
    const countryLocations = locationsByCountry.get(country) ?? [];
    countryLocations.push(location);
    locationsByCountry.set(country, countryLocations);
  }

  const selectedLocations = Array.from(locationsByCountry.values())
    .map((countryLocations) => countryLocations.sort(compareStableSampleOrder)[0])
    .filter(Boolean)
    .slice(0, pinCount);
  const selectedIds = new Set(selectedLocations.map((location) => location.id));
  const remainingLocations = candidates
    .filter((location) => !selectedIds.has(location.id))
    .sort(compareStableSampleOrder)
    .slice(0, Math.max(0, pinCount - selectedLocations.length));

  return [...selectedLocations, ...remainingLocations];
}

function compareStableSampleOrder(first: LocationWithPhotos, second: LocationWithPhotos) {
  return hashString(`${first.country ?? ''}-${first.name ?? first.id}`) - hashString(`${second.country ?? ''}-${second.name ?? second.id}`);
}

function hashString(value: string) {
  return Array.from(value).reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0);
}

const mapLayerStyles = {
  locationDot: {
    circleColor: AppColors.primary,
    circleOpacity: 0.92,
    circleRadius: 4,
    circleStrokeColor: AppColors.surface,
    circleStrokeWidth: 1.5,
  },
} satisfies Record<string, Mapbox.CircleLayerStyle>;

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
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
  photoPin: {
    width: 40,
    height: 48,
    alignItems: 'center',
  },
  photoPinBubble: {
    width: 38,
    height: 38,
    overflow: 'hidden',
    borderRadius: 19,
    borderWidth: 2,
    borderColor: AppColors.primary,
    backgroundColor: AppColors.surface,
    boxShadow: `0 5px 12px ${AppColors.shadow}`,
  },
  photoPinImage: {
    width: '100%',
    height: '100%',
  },
  photoPinTip: {
    width: 13,
    height: 13,
    marginTop: -8,
    transform: [{ rotate: '45deg' }],
    borderBottomRightRadius: 3,
    backgroundColor: AppColors.primary,
  },
});
