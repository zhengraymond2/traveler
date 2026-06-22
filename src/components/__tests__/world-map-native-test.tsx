import { act, fireEvent } from '@testing-library/react-native';
import * as React from 'react';

import { MapTuning } from '@/constants/map';
import type { LocationWithPhotos } from '@/db/repository';
import { UITestHelper } from '@/test/UITestHelper';
import type { WorldMapHandle } from '../world-map.native';

process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = 'test-token';

const mockMapView = jest.fn(({ children }) => children);
const mockSetAccessToken = jest.fn();
const mockSetCamera = jest.fn();

jest.mock('@rnmapbox/maps', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    __esModule: true,
    default: {
      setAccessToken: (...args: unknown[]) => mockSetAccessToken(...args),
      StyleURL: {
        Outdoors: 'outdoors',
      },
      MapView: mockMapView,
      Camera: React.forwardRef(function MockCamera(_props: unknown, ref: React.Ref<unknown>) {
        React.useImperativeHandle(ref, () => ({
          setCamera: (...args: unknown[]) => mockSetCamera(...args),
        }));

        return <View testID="mapbox-camera" />;
      }),
      RasterDemSource: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
      Terrain: () => <View />,
      UserLocation: () => <View />,
      LocationPuck: () => <View />,
      ShapeSource: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
      CircleLayer: () => <View />,
      SymbolLayer: () => <View />,
      MarkerView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    },
  };
});

jest.mock('expo-glass-effect', () => ({
  GlassView: ({ children }: { children: React.ReactNode }) => children,
  isGlassEffectAPIAvailable: jest.fn(() => false),
}));

jest.mock('expo-image', () => ({
  Image: () => null,
}));

jest.mock('expo-location', () => ({
  Accuracy: {
    Balanced: 'balanced',
  },
  PermissionStatus: {
    GRANTED: 'granted',
  },
  getCurrentPositionAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const animation = {
    duration: () => animation,
  };

  return {
    __esModule: true,
    default: {
      View,
    },
    FadeIn: animation,
    FadeOut: animation,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { WorldMap, mapCompassControlProps } = require('../world-map.native') as typeof import('../world-map.native');

describe('WorldMap native controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('places the compass below the search control on the right edge', () => {
    expect(mapCompassControlProps).toEqual({
      compassViewPosition: 1,
      compassPosition: { right: 27, top: 135 },
    });
  });

  test('waits for a non-zero container layout before mounting the native map view', async () => {
    const screen = await UITestHelper.renderWithPaper(<WorldMap locations={[createLocation()]} />);

    expect(mockMapView).not.toHaveBeenCalled();

    await layOutWorldMap(screen);

    expect(await screen.findByTestId('mapbox-camera')).toBeTruthy();
    expect(mockMapView).toHaveBeenCalledTimes(1);
  });

  test('zooms to the saved-location level and centers a pressed marker from a wider view', async () => {
    const screen = await renderLaidOutWorldMap([createLocation()]);
    reportCameraZoom(3);

    fireEvent.press(screen.getByLabelText('Open Mont Saint Michel preview'));

    expect(mockSetCamera).toHaveBeenCalledWith(
      expect.objectContaining({
        centerCoordinate: [-1.5115, 48.636],
        zoomLevel: MapTuning.locationSearchZoomLevel,
      })
    );
  });

  test('keeps the current zoom and centers a pressed marker from a closer view', async () => {
    const screen = await renderLaidOutWorldMap([createLocation()]);
    reportCameraZoom(7.4);

    fireEvent.press(screen.getByLabelText('Open Mont Saint Michel preview'));

    expect(mockSetCamera).toHaveBeenCalledWith(
      expect.objectContaining({
        centerCoordinate: [-1.5115, 48.636],
        zoomLevel: 7.4,
      })
    );
  });

  test('opens the location preview when a search result matches a saved location', async () => {
    const mapRef = React.createRef<WorldMapHandle>();
    const screen = await UITestHelper.renderWithPaper(<WorldMap ref={mapRef} locations={[createLocation()]} />);
    await layOutWorldMap(screen);

    await act(async () => {
      expect(
        mapRef.current?.moveToSearchResult(
          { latitude: 48.636, longitude: -1.5115 },
          MapTuning.locationSearchZoomLevel,
          'mont-saint-michel'
        )
      ).toBe(true);
    });

    expect(await screen.findByText('Mont Saint Michel')).toBeTruthy();
    expect(mockSetCamera).toHaveBeenCalledWith(
      expect.objectContaining({
        centerCoordinate: [-1.5115, 48.636],
        zoomLevel: MapTuning.locationSearchZoomLevel,
      })
    );
  });

  test('removes photo markers immediately when they leave the current map locations', async () => {
    const screen = await renderLaidOutWorldMap([createLocation()]);

    expect(screen.getByLabelText('Open Mont Saint Michel preview')).toBeTruthy();

    await act(async () => {
      screen.rerender(<WorldMap locations={[]} />);
    });

    expect(screen.queryByLabelText('Open Mont Saint Michel preview')).toBeNull();
  });
});

async function renderLaidOutWorldMap(locations: LocationWithPhotos[]) {
  const screen = await UITestHelper.renderWithPaper(<WorldMap locations={locations} />);
  await layOutWorldMap(screen);
  return screen;
}

async function layOutWorldMap(screen: Awaited<ReturnType<typeof UITestHelper.renderWithPaper>>) {
  await act(async () => {
    fireEvent(screen.getByTestId('world-map-container'), 'layout', createLayoutEvent(390, 844));
  });
}

function createLayoutEvent(width: number, height: number) {
  return {
    nativeEvent: {
      layout: {
        width,
        height,
      },
    },
  };
}

function reportCameraZoom(zoom: number) {
  const props = mockMapView.mock.calls[0]?.[0];
  props.onCameraChanged({
    properties: {
      bounds: {
        ne: [0, 0],
        sw: [0, 0],
      },
      center: [-1.5115, 48.636],
      heading: 0,
      pitch: 0,
      zoom,
    },
    gestures: {
      isGestureActive: false,
    },
  });
}

function createLocation(): LocationWithPhotos {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');

  return {
    id: 'mont-saint-michel',
    name: 'Mont Saint Michel',
    latitude: 48.636,
    longitude: -1.5115,
    googleMapsUrl: null,
    instagramUrl: null,
    instagramFeedUrl: null,
    trailMapUrl: null,
    fieldConfidenceJson: null,
    notes: null,
    country: 'France',
    category: 'attraction',
    createdAt,
    updatedAt: createdAt,
    photos: [
      {
        id: 'photo-1',
        locationId: 'mont-saint-michel',
        uri: 'https://example.com/mont.jpg',
        caption: null,
        createdAt,
      },
    ],
  };
}
