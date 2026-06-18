import Mapbox, { type Location, type MapState } from '@rnmapbox/maps';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { Image } from 'expo-image';
import * as ExpoLocation from 'expo-location';
import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { BounceIn, BounceOut, FadeIn, FadeOut } from 'react-native-reanimated';

import { getLocationCategoryAppearance } from '@/constants/location-categories';
import { MapGestureSettings, MapTerrainStyle, MapTuning, PhotoPinDensityStops } from '@/constants/map';
import { AppColors } from '@/constants/theme';
import type { LocationWithPhotos } from '@/db/repository';

const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
const INITIAL_CAMERA_SNAPSHOT: MapCameraSnapshot = {
  bounds: null,
  zoom: 0,
  zoomBucket: 0,
};
let hasCenteredOnStartupLocation = false;

if (mapboxAccessToken) {
  Mapbox.setAccessToken(mapboxAccessToken);
}

type WorldMapProps = {
  locations?: LocationWithPhotos[];
};

export type WorldMapHandle = {
  moveToCountryCoordinate: (coordinate: MapCoordinate) => boolean;
  moveToUserLocation: () => Promise<boolean>;
};

export type MapCoordinate = {
  latitude: number;
  longitude: number;
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

export const WorldMap = React.forwardRef<WorldMapHandle, WorldMapProps>(function WorldMap(
  { locations = [] },
  ref
) {
  const cameraRef = React.useRef<Mapbox.Camera>(null);
  const userCoordinateRef = React.useRef<CoordinatePair | null>(null);
  const cameraSamplingStateRef = React.useRef({
    hasCommittedSnapshot: false,
    hasMovedSinceCommit: true,
    lastCommittedSnapshot: INITIAL_CAMERA_SNAPSHOT,
  });
  const [hasLocationPermission, setHasLocationPermission] = React.useState(false);
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

  const flyToCountryLevel = React.useCallback((coordinate: CoordinatePair | null) => {
    if (!coordinate) {
      return false;
    }

    cameraRef.current?.setCamera({
      centerCoordinate: coordinate,
      zoomLevel: MapTuning.countryViewZoomLevel,
      animationDuration: MapTuning.cameraAnimationDurationMs,
      animationMode: 'flyTo',
    });
    return true;
  }, []);

  const requestCurrentUserCoordinate = React.useCallback(async () => {
    try {
      const permission = await ExpoLocation.requestForegroundPermissionsAsync();

      if (permission.status !== ExpoLocation.PermissionStatus.GRANTED) {
        setHasLocationPermission(false);
        return null;
      }

      setHasLocationPermission(true);

      const currentLocation = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      const coordinate = getExpoLocationCoordinate(currentLocation);
      userCoordinateRef.current = coordinate;

      return coordinate;
    } catch (error) {
      console.warn('Unable to get current location:', error);
      return null;
    }
  }, []);

  React.useEffect(() => {
    if (!mapboxAccessToken || hasCenteredOnStartupLocation) {
      return;
    }

    let isActive = true;

    async function centerOnStartupLocation() {
      const coordinate = await requestCurrentUserCoordinate();

      if (!isActive || !coordinate || hasCenteredOnStartupLocation) {
        return;
      }

      hasCenteredOnStartupLocation = true;
      flyToCountryLevel(coordinate);
    }

    void centerOnStartupLocation();

    return () => {
      isActive = false;
    };
  }, [flyToCountryLevel, requestCurrentUserCoordinate]);

  React.useImperativeHandle(
    ref,
    () => ({
      moveToCountryCoordinate: (coordinate) => {
        return flyToCountryLevel([coordinate.longitude, coordinate.latitude]);
      },
      moveToUserLocation: async () => {
        const coordinate = await requestCurrentUserCoordinate();

        return flyToCountryLevel(coordinate) || flyToCountryLevel(userCoordinateRef.current);
      },
    }),
    [flyToCountryLevel, requestCurrentUserCoordinate]
  );

  const handleLocationPress = React.useCallback((location: CoordinateLocation) => {
    setSelectedLocation(location);
    flyToCountryLevel([location.longitude, location.latitude]);
  }, [flyToCountryLevel]);

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
    const nextSnapshot = createCameraSnapshot(state);
    const samplingState = cameraSamplingStateRef.current;

    if (
      !samplingState.hasCommittedSnapshot ||
      !areCameraSnapshotsEqual(samplingState.lastCommittedSnapshot, nextSnapshot)
    ) {
      samplingState.hasMovedSinceCommit = true;
    }
  }, []);

  const handleMapIdle = React.useCallback((state: MapState) => {
    const samplingState = cameraSamplingStateRef.current;
    if (samplingState.hasCommittedSnapshot && !samplingState.hasMovedSinceCommit) {
      return;
    }

    const nextSnapshot = createCameraSnapshot(state);
    samplingState.hasCommittedSnapshot = true;
    samplingState.hasMovedSinceCommit = false;
    samplingState.lastCommittedSnapshot = nextSnapshot;

    setCameraSnapshot((currentSnapshot) => {
      return areCameraSnapshotsEqual(currentSnapshot, nextSnapshot) ? currentSnapshot : nextSnapshot;
    });
  }, []);

  const handleUserLocationUpdate = React.useCallback((location: Location) => {
    const coordinate = getUserLocationCoordinate(location);

    if (!coordinate) {
      return;
    }

    userCoordinateRef.current = coordinate;
    setHasLocationPermission(true);

    if (hasCenteredOnStartupLocation) {
      return;
    }

    hasCenteredOnStartupLocation = true;
    flyToCountryLevel(coordinate);
  }, [flyToCountryLevel]);

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
        styleURL={Mapbox.StyleURL.Outdoors}
        projection="globe"
        compassEnabled
        compassFadeWhenNorth={false}
        compassViewPosition={0}
        compassViewMargins={{ x: 16, y: 64 }}
        scaleBarEnabled={false}
        pitchEnabled
        rotateEnabled
        maxPitch={70}
        gestureSettings={MapGestureSettings}
        onCameraChanged={handleCameraChanged}
        onMapIdle={handleMapIdle}>
        <Mapbox.Camera
          ref={cameraRef}
          centerCoordinate={[0, 20]}
          zoomLevel={0}
          minZoomLevel={0}
          animationMode="none"
        />
        <Mapbox.RasterDemSource
          id={MapTuning.terrainSourceId}
          url={MapTuning.mapboxTerrainDemUrl}
          tileSize={512}
          maxZoomLevel={14}
        />
        <Mapbox.Terrain sourceID={MapTuning.terrainSourceId} style={MapTerrainStyle} />
        {hasLocationPermission ? (
          <>
            <Mapbox.UserLocation visible={false} minDisplacement={25} onUpdate={handleUserLocationUpdate} />
            <Mapbox.LocationPuck
              pulsing={{ isEnabled: true, color: AppColors.mapUserLocationPulse, radius: 52 }}
              visible
            />
          </>
        ) : null}
        {locationDotShape.features.length ? (
          <Mapbox.ShapeSource
            id="saved-location-dots"
            shape={locationDotShape}
            hitbox={{ width: 44, height: 44 }}
            onPress={handleDotPress}>
            <Mapbox.CircleLayer id="saved-location-dot-layer" style={mapLayerStyles.locationDot} />
            <Mapbox.SymbolLayer id="saved-location-icon-layer" style={mapLayerStyles.locationIcon} />
          </Mapbox.ShapeSource>
        ) : null}
        {sampledPinLocations.map((location) => (
          <PhotoMarker key={location.id} location={location} onPress={handleLocationPress} />
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
});

type CoordinateLocation = LocationWithPhotos & { latitude: number; longitude: number };

function PhotoMarker({
  location,
  onPress,
}: {
  location: CoordinateLocation & { photos: [{ uri: string }, ...LocationWithPhotos['photos']] };
  onPress: (location: CoordinateLocation) => void;
}) {
  const categoryAppearance = getLocationCategoryAppearance(location.category);

  return (
    <Mapbox.MarkerView
      allowOverlap={false}
      anchor={{ x: 0.5, y: 1 }}
      coordinate={[location.longitude, location.latitude]}>
      <Animated.View
        entering={BounceIn.duration(520)}
        exiting={BounceOut.duration(260)}
        style={styles.photoPinAnimated}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${getLocationName(location)} preview`}
          hitSlop={8}
          style={styles.photoPin}
          onPress={() => onPress(location)}>
          <View style={[styles.photoPinBubble, { borderColor: categoryAppearance.color }]}>
            <Image source={{ uri: location.photos[0].uri }} style={styles.photoPinImage} contentFit="cover" />
            <View style={[styles.photoPinIconBadge, { backgroundColor: categoryAppearance.color }]}>
              <Text selectable={false} variant="labelSmall" style={styles.photoPinIconText}>
                {categoryAppearance.glyph}
              </Text>
            </View>
          </View>
          <View style={[styles.photoPinTip, { backgroundColor: categoryAppearance.color }]} />
        </Pressable>
      </Animated.View>
    </Mapbox.MarkerView>
  );
}

function LocationPreviewDialog({ location, onClose }: { location: CoordinateLocation; onClose: () => void }) {
  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(250)}
      style={styles.previewDialog}>
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
    </Animated.View>
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
        category: location.category,
        id: location.id,
        markerColor: getLocationCategoryAppearance(location.category).color,
        markerGlyph: getLocationCategoryAppearance(location.category).glyph,
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

  const densityStop = getPhotoPinDensityStop(zoom);

  return Math.min(
    candidateCount,
    densityStop.pinBudget,
    Math.max(1, Math.ceil(candidateCount * densityStop.sampleRatio))
  );
}

function getPhotoPinDensityStop(zoom: number) {
  return PhotoPinDensityStops.find((densityStop) => zoom < densityStop.maxZoom) ?? PhotoPinDensityStops[0];
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

function createCameraSnapshot(state: MapState): MapCameraSnapshot {
  const zoom = getFiniteZoom(state.properties.zoom);

  return {
    bounds: getVisibleBounds(state.properties.bounds),
    zoom,
    zoomBucket: getZoomSampleBucket(zoom),
  };
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

function getUserLocationCoordinate(location: Location): CoordinatePair | null {
  const { longitude, latitude } = location.coords;

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return [longitude, latitude];
}

function getExpoLocationCoordinate(location: ExpoLocation.LocationObject): CoordinatePair | null {
  const { longitude, latitude } = location.coords;

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return [longitude, latitude];
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

  return Array.from({ length: MapTuning.previewGalleryCellCount }, (_, index) => {
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
    circleColor: ['coalesce', ['get', 'markerColor'], AppColors.primary],
    circleOpacity: 0.92,
    circleRadius: 8,
    circleStrokeColor: AppColors.surface,
    circleStrokeWidth: 1.5,
  },
  locationIcon: {
    textAllowOverlap: true,
    textColor: AppColors.textInverse,
    textField: ['coalesce', ['get', 'markerGlyph'], '✦'],
    textHaloColor: 'rgba(0, 0, 0, 0.12)',
    textHaloWidth: 0.3,
    textIgnorePlacement: true,
    textSize: 10,
  },
} satisfies {
  locationDot: Mapbox.CircleLayerStyle;
  locationIcon: Mapbox.SymbolLayerStyle;
};

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
  photoPinAnimated: {
    width: 40,
    height: 48,
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
  photoPinIconBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: AppColors.surface,
  },
  photoPinIconText: {
    color: AppColors.textInverse,
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
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
