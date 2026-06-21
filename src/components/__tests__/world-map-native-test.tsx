import { mapCompassControlProps } from '../world-map.native';

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
  requestForegroundPermissionsAsync: jest.fn(),
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
    BounceIn: animation,
    BounceOut: animation,
    FadeIn: animation,
    FadeOut: animation,
  };
});

describe('WorldMap native controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('places the compass below the search control on the right edge', () => {
    expect(mapCompassControlProps).toEqual({
      compassViewPosition: 1,
      compassViewMargins: { x: 27, y: 132 },
    });
  });
});
