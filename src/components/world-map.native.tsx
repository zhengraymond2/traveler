import Mapbox, { type MapState } from '@rnmapbox/maps';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppColors } from '@/constants/theme';
import type { LocationWithPhotos } from '@/db/repository';

const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
const COUNTRY_VIEW_ZOOM_LEVEL = 4.15;
const CAMERA_ANIMATION_DURATION_MS = 900;
const PREVIEW_GALLERY_CELL_COUNT = 9;
const INITIAL_CAMERA_SNAPSHOT: MapCameraSnapshot = {
  bounds: null,
  zoom: 0,
  zoomBucket: 0,
};

if (mapboxAccessToken) {
  Mapbox.setAccessToken(mapboxAccessToken);
}

type WorldMapProps = {
  locations?: LocationWithPhotos[];
};

type MapCameraSnapshot = {
  bounds: VisibleBounds | null;
  zoom: number;
  zoomBucket: number;
};

type VisibleBounds = {
  ne: CoordinatePair;
  sw: CoordinatePair;
};

type CoordinatePair = [longitude: number, latitude: number];

export function WorldMap({ locations = [] }: WorldMapProps) {
  const cameraRef = React.useRef<Mapbox.Camera>(null);
  const [cameraSnapshot, setCameraSnapshot] = React.useState<MapCameraSnapshot>(INITIAL_CAMERA_SNAPSHOT);
  const [selectedLocation, setSelectedLocation] = React.useState<CoordinateLocation | null>(null);
  const locationDotShape = React.useMemo(() => createLocationDotShape(locations), [locations]);
  const sampledPinLocations = React.useMemo(
    () => sampleImagePinLocations(locations, cameraSnapshot),
    [cameraSnapshot, locations]
  );
  const locationsById = React.useMemo(() => {
    return new Map(locations.filter(hasCoordinates).map((location) => [location.id, location]));
  }, [locations]);

  React.useEffect(() => {
    if (selectedLocation && !locationsById.has(selectedLocation.id)) {
      setSelectedLocation(null);
    }
  }, [locationsById, selectedLocation]);

  const handleLocationPress = React.useCallback((location: CoordinateLocation) => {
    setSelectedLocation(location);
    cameraRef.current?.setCamera({
      centerCoordinate: [location.longitude, location.latitude],
      zoomLevel: COUNTRY_VIEW_ZOOM_LEVEL,
      animationDuration: CAMERA_ANIMATION_DURATION_MS,
      animationMode: 'flyTo',
    });
  }, []);

  const handleDotPress = React.useCallback(
    (event: { features: GeoJSON.Feature[] }) => {
      const feature = event.features[0];
      const locationId = getFeatureLocationId(feature);
      const pressedLocation = locationId ? locationsById.get(locationId) : null;

      if (pressedLocation) {
        handleLocationPress(pressedLocation);
      }
    },
    [handleLocationPress, locationsById]
  );

  const handleCameraChanged = React.useCallback((state: MapState) => {
    setCameraSnapshot((currentSnapshot) => {
      const zoom = getFiniteZoom(state.properties.zoom);
      const zoomBucket = getZoomSampleBucket(zoom);

      if (currentSnapshot.zoomBucket === zoomBucket) {
        return currentSnapshot;
      }

      return {
        ...currentSnapshot,
        zoom,
        zoomBucket,
      };
    });
  }, []);

  const handleMapIdle = React.useCallback((state: MapState) => {
    setCameraSnapshot((currentSnapshot) => {
      const zoom = getFiniteZoom(state.properties.zoom);
      const nextSnapshot = {
        bounds: getVisibleBounds(state.properties.bounds),
        zoom,
        zoomBucket: getZoomSampleBucket(zoom),
      };

      return areCameraSnapshotsEqual(currentSnapshot, nextSnapshot) ? currentSnapshot : nextSnapshot;
    });
  }, []);

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
    <View style={styles.mapContainer}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={Mapbox.StyleURL.Light}
        projection="globe"
        compassEnabled={false}
        scaleBarEnabled={false}
        onCameraChanged={handleCameraChanged}
        onMapIdle={handleMapIdle}>
        <Mapbox.Camera
          ref={cameraRef}
          centerCoordinate={[0, 20]}
          zoomLevel={0}
          minZoomLevel={0}
          animationMode="none"
        />
        {locationDotShape.features.length ? (
          <Mapbox.ShapeSource
            id="saved-location-dots"
            shape={locationDotShape}
            hitbox={{ width: 44, height: 44 }}
            onPress={handleDotPress}>
            <Mapbox.CircleLayer id="saved-location-dot-layer" style={mapLayerStyles.locationDot} />
          </Mapbox.ShapeSource>
        ) : null}
        {sampledPinLocations.map((location) => (
          <Mapbox.MarkerView
            key={location.id}
            allowOverlap={false}
            anchor={{ x: 0.5, y: 1 }}
            coordinate={[location.longitude, location.latitude]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${getLocationName(location)} preview`}
              hitSlop={8}
              style={styles.photoPin}
              onPress={() => handleLocationPress(location)}>
              <View style={styles.photoPinBubble}>
                <Image source={{ uri: location.photos[0].uri }} style={styles.photoPinImage} contentFit="cover" />
              </View>
              <View style={styles.photoPinTip} />
            </Pressable>
          </Mapbox.MarkerView>
        ))}
      </Mapbox.MapView>

      {selectedLocation ? (
        <Pressable
          accessibilityLabel="Close location preview"
          accessibilityRole="button"
          style={styles.previewDismissLayer}
          onPress={() => setSelectedLocation(null)}
        />
      ) : null}

      {selectedLocation ? (
        <LocationPreviewDialog location={selectedLocation} onClose={() => setSelectedLocation(null)} />
      ) : null}
    </View>
  );
}

type CoordinateLocation = LocationWithPhotos & { latitude: number; longitude: number };

function LocationPreviewDialog({ location, onClose }: { location: CoordinateLocation; onClose: () => void }) {
  return (
    <View style={styles.previewDialog}>
      <BlurredHeader>
        <View style={styles.previewHeaderContent}>
          <Text selectable variant="titleLarge" numberOfLines={2} style={styles.previewTitle}>
            {getLocationName(location)}
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`See more details for ${getLocationName(location)}`}
            hitSlop={10}
            style={styles.seeMoreButton}
            onPress={() => {
              router.push({ pathname: '/saved/location/[id]', params: { id: location.id } });
            }}>
            <Text variant="labelLarge" style={styles.seeMoreText}>
              See more &gt;
            </Text>
          </Pressable>
        </View>
      </BlurredHeader>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close location preview"
        hitSlop={10}
        style={styles.closeButton}
        onPress={onClose}>
        <Text variant="titleMedium" style={styles.closeButtonText}>
          X
        </Text>
      </Pressable>

      <View style={styles.previewGallery}>{getGalleryCells(location).map(renderGalleryCell)}</View>
    </View>
  );
}

function BlurredHeader({ children }: { children: React.ReactNode }) {
  if (canUseGlassEffect()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor="rgba(255, 255, 255, 0.76)"
        colorScheme="light"
        style={styles.previewHeader}>
        {children}
      </GlassView>
    );
  }

  return <View style={[styles.previewHeader, styles.previewHeaderFallback]}>{children}</View>;
}

function renderGalleryCell(photoUri: string | null, index: number) {
  return (
    <View key={`${photoUri ?? 'empty'}-${index}`} style={styles.previewGalleryCell}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.previewGalleryImage} contentFit="cover" />
      ) : null}
    </View>
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

function hasCoordinates(location: LocationWithPhotos): location is CoordinateLocation {
  return Number.isFinite(location.latitude) && Number.isFinite(location.longitude);
}

function hasPhotoAndCoordinates(
  location: LocationWithPhotos
): location is LocationWithPhotos & { latitude: number; longitude: number; photos: [{ uri: string }, ...LocationWithPhotos['photos']] } {
  return hasCoordinates(location) && location.photos.length > 0;
}

function sampleImagePinLocations(locations: LocationWithPhotos[], cameraSnapshot: MapCameraSnapshot) {
  const candidates = locations.filter(hasPhotoAndCoordinates);
  const bounds = cameraSnapshot.bounds;
  const visibleCandidates = bounds ? candidates.filter((location) => isLocationInBounds(location, bounds)) : candidates;
  const pinCount = getPhotoPinCount(visibleCandidates.length, cameraSnapshot.zoomBucket);
  const locationsByCountry = new Map<string, typeof candidates>();

  for (const location of visibleCandidates) {
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
  const remainingLocations = visibleCandidates
    .filter((location) => !selectedIds.has(location.id))
    .sort(compareStableSampleOrder)
    .slice(0, Math.max(0, pinCount - selectedLocations.length));

  return [...selectedLocations, ...remainingLocations];
}

function getPhotoPinCount(candidateCount: number, zoom: number) {
  if (candidateCount <= 0) {
    return 0;
  }

  const sampleRatio = getPhotoPinSampleRatio(zoom);
  const pinBudget = getPhotoPinBudget(zoom);

  return Math.min(candidateCount, pinBudget, Math.max(1, Math.ceil(candidateCount * sampleRatio)));
}

function getPhotoPinSampleRatio(zoom: number) {
  if (zoom < 2) {
    return 0.25;
  }

  if (zoom < 4) {
    return 0.4;
  }

  if (zoom < 6) {
    return 0.75;
  }

  if (zoom < 8) {
    return 0.9;
  }

  return 1;
}

function getPhotoPinBudget(zoom: number) {
  if (zoom < 2) {
    return 8;
  }

  if (zoom < 4) {
    return 14;
  }

  if (zoom < 6) {
    return 24;
  }

  if (zoom < 8) {
    return 36;
  }

  return 56;
}

function isLocationInBounds(location: CoordinateLocation, bounds: VisibleBounds) {
  const [east, north] = bounds.ne;
  const [west, south] = bounds.sw;
  const latitudeMin = Math.min(south, north);
  const latitudeMax = Math.max(south, north);
  const longitude = normalizeLongitude(location.longitude);
  const westLongitude = normalizeLongitude(west);
  const eastLongitude = normalizeLongitude(east);
  const isWithinLatitude = location.latitude >= latitudeMin && location.latitude <= latitudeMax;
  const isWithinLongitude =
    westLongitude <= eastLongitude
      ? longitude >= westLongitude && longitude <= eastLongitude
      : longitude >= westLongitude || longitude <= eastLongitude;

  return isWithinLatitude && isWithinLongitude;
}

function compareStableSampleOrder(first: LocationWithPhotos, second: LocationWithPhotos) {
  return hashString(`${first.country ?? ''}-${first.name ?? first.id}`) - hashString(`${second.country ?? ''}-${second.name ?? second.id}`);
}

function hashString(value: string) {
  return Array.from(value).reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0);
}

function getFiniteZoom(zoom: number) {
  return Number.isFinite(zoom) ? Math.max(0, zoom) : 0;
}

function getZoomSampleBucket(zoom: number) {
  return Math.floor(getFiniteZoom(zoom) * 2) / 2;
}

function getVisibleBounds(bounds: MapState['properties']['bounds']) {
  const ne = getCoordinatePair(bounds.ne);
  const sw = getCoordinatePair(bounds.sw);

  if (!ne || !sw) {
    return null;
  }

  return { ne, sw };
}

function getCoordinatePair(position: GeoJSON.Position | undefined): CoordinatePair | null {
  const longitude = position?.[0];
  const latitude = position?.[1];

  if (
    typeof longitude !== 'number' ||
    typeof latitude !== 'number' ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    return null;
  }

  return [longitude, latitude];
}

function areCameraSnapshotsEqual(first: MapCameraSnapshot, second: MapCameraSnapshot) {
  return first.zoomBucket === second.zoomBucket && areVisibleBoundsEqual(first.bounds, second.bounds);
}

function areVisibleBoundsEqual(first: VisibleBounds | null, second: VisibleBounds | null) {
  if (!first || !second) {
    return first === second;
  }

  return areCoordinatePairsClose(first.ne, second.ne) && areCoordinatePairsClose(first.sw, second.sw);
}

function areCoordinatePairsClose(first: CoordinatePair, second: CoordinatePair) {
  return Math.abs(first[0] - second[0]) < 0.02 && Math.abs(first[1] - second[1]) < 0.02;
}

function normalizeLongitude(longitude: number) {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

function getFeatureLocationId(feature: GeoJSON.Feature | undefined) {
  const propertyId = feature?.properties?.id;
  const featureId = feature?.id;

  if (typeof propertyId === 'string') {
    return propertyId;
  }

  if (typeof featureId === 'string') {
    return featureId;
  }

  if (typeof featureId === 'number') {
    return String(featureId);
  }

  return null;
}

function getLocationName(location: LocationWithPhotos) {
  return location.name?.trim() || 'Untitled location';
}

function getGalleryCells(location: LocationWithPhotos) {
  const photoUris = location.photos.map((photo) => photo.uri).filter(Boolean);

  return Array.from({ length: PREVIEW_GALLERY_CELL_COUNT }, (_, index) => {
    if (!photoUris.length) {
      return null;
    }

    return photoUris[index % photoUris.length];
  });
}

function canUseGlassEffect() {
  try {
    return isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
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
  mapContainer: {
    flex: 1,
  },
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
  previewDismissLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: AppColors.overlayTransparent,
  },
  previewDialog: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 152,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: AppColors.surface,
    boxShadow: `0 18px 38px ${AppColors.shadow}`,
  },
  previewHeader: {
    minHeight: 76,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  previewHeaderFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
  },
  previewHeaderContent: {
    gap: 8,
    paddingRight: 58,
  },
  previewTitle: {
    color: AppColors.text,
    fontWeight: '700',
    letterSpacing: 0,
  },
  seeMoreButton: {
    alignSelf: 'flex-start',
  },
  seeMoreText: {
    color: AppColors.primary,
    fontWeight: '700',
    letterSpacing: 0,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  closeButtonText: {
    marginTop: -2,
    color: AppColors.text,
    fontWeight: '600',
    lineHeight: 24,
  },
  previewGallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    backgroundColor: AppColors.surface,
  },
  previewGalleryCell: {
    width: '33.333333%',
    aspectRatio: 1,
    backgroundColor: AppColors.imageFallback,
  },
  previewGalleryImage: {
    width: '100%',
    height: '100%',
  },
});
