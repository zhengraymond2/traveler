import { fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import MapScreen from '../index';
import { UITestHelper } from '@/test/UITestHelper';

const mockListLocationsWithPhotos = jest.fn();
const mockMoveToCountryCoordinate = jest.fn();
const mockMoveToUserLocation = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('@/auth', () => ({
  useAuth: () => ({
    user: {
      displayName: 'Raymond Z',
      email: 'zhray@example.com',
      initials: 'RZ',
    },
  }),
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    router: {
      push: (...args: unknown[]) => mockRouterPush(...args),
    },
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(effect, [effect]);
    },
  };
});

jest.mock('@/components/map-region-search', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    MapRegionSearch: () => <View testID="map-region-search" />,
  };
});

jest.mock('@/components/world-map', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    WorldMap: React.forwardRef(function MockWorldMap(_props: unknown, ref: React.Ref<unknown>) {
      React.useImperativeHandle(ref, () => ({
        moveToCountryCoordinate: (...args: unknown[]) => mockMoveToCountryCoordinate(...args),
        moveToUserLocation: (...args: unknown[]) => mockMoveToUserLocation(...args),
      }));

      return <View testID="world-map" />;
    }),
  };
});

jest.mock('@/services/app-services', () => ({
  useServices: () => ({
    savedLocationsReader: {
      listLocationsWithPhotos: (...args: unknown[]) => mockListLocationsWithPhotos(...args),
    },
  }),
}));

describe('MapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListLocationsWithPhotos.mockResolvedValue([]);
  });

  test('places the current-location control in the right-side stack under the compass', async () => {
    const screen = await UITestHelper.renderWithPaper(<MapScreen />);
    const locationButton = screen.getByLabelText('Center on current location');
    const locationButtonStyle = StyleSheet.flatten(resolvePressableStyle(locationButton.props.style));

    expect(locationButtonStyle).toMatchObject({
      position: 'absolute',
      right: 27,
      top: 135,
      width: 38,
      height: 38,
      borderRadius: 19,
    });
    expect(locationButtonStyle.bottom).toBeUndefined();
  });

  test('sizes the current-location glyph to match the compass diameter', async () => {
    const screen = await UITestHelper.renderWithPaper(<MapScreen />);
    const locationGlyph = screen.getByTestId('current-location-glyph');
    const locationGlyphStyle = StyleSheet.flatten(locationGlyph.props.style);

    expect(locationGlyphStyle).toMatchObject({
      width: 30,
      height: 30,
    });
  });

  test('opens profile from a floating avatar on the map', async () => {
    const screen = await UITestHelper.renderWithPaper(<MapScreen />);
    const profileButton = screen.getByLabelText('Open profile');
    const profileButtonStyle = StyleSheet.flatten(resolvePressableStyle(profileButton.props.style));

    expect(profileButtonStyle).toMatchObject({
      position: 'absolute',
      left: 16,
      top: 64,
      width: 44,
      height: 44,
      borderRadius: 22,
    });

    fireEvent.press(profileButton);

    expect(mockRouterPush).toHaveBeenCalledWith('/profile');
  });
});

function resolvePressableStyle(style: unknown) {
  if (typeof style === 'function') {
    return style({ pressed: false });
  }

  return style;
}
