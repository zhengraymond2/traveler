import Mapbox from '@rnmapbox/maps';
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
});
