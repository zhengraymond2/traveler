import { fireEvent } from '@testing-library/react-native';
import type { Ref } from 'react';

import { UITestHelper } from '@/test/UITestHelper';

import MapScreen from '../index';

const mockListLocationsWithPhotos = jest.fn();
const mockMoveToCountryCoordinate = jest.fn();
const mockMoveToSearchResult = jest.fn();
const mockMoveToUserLocation = jest.fn();

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');

  return {
    router: {
      push: jest.fn(),
    },
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(effect, [effect]);
    },
  };
});

jest.mock('@/db/database-provider', () => ({
  useDatabase: () => ({}),
}));

jest.mock('@/services/app-services', () => ({
  useServices: () => ({
    savedLocationsReader: {
      listLocationsWithPhotos: mockListLocationsWithPhotos,
    },
  }),
}));

jest.mock('@/components/world-map', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  const MockWorldMap = React.forwardRef(function MockWorldMap(_props: unknown, ref: Ref<unknown>) {
    React.useImperativeHandle(ref, () => ({
      moveToCountryCoordinate: mockMoveToCountryCoordinate,
      moveToSearchResult: mockMoveToSearchResult,
      moveToUserLocation: mockMoveToUserLocation,
    }));

    return <View testID="world-map" />;
  });

  return { WorldMap: MockWorldMap };
});

jest.mock('@/components/map-region-search', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native');

  return {
    MapRegionSearch: ({ onSelect }: { onSelect: (option: unknown) => void }) => (
      <Pressable
        testID="select-map-search-result"
        onPress={() =>
          onSelect({
            center: { latitude: 48.636, longitude: -1.5115 },
            label: 'Mont Saint Michel',
            source: 'location',
            value: 'mont-saint-michel',
            zoomLevel: 5.15,
          })
        }>
        <Text>Mont Saint Michel</Text>
      </Pressable>
    ),
  };
});

describe('MapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListLocationsWithPhotos.mockResolvedValue([]);
    mockMoveToUserLocation.mockResolvedValue(false);
  });

  test('centers search results with their option zoom level', async () => {
    const screen = await UITestHelper.renderWithPaper(<MapScreen />);

    fireEvent.press(screen.getByTestId('select-map-search-result'));

    expect(mockMoveToSearchResult).toHaveBeenCalledWith({ latitude: 48.636, longitude: -1.5115 }, 5.15);
    expect(mockMoveToCountryCoordinate).not.toHaveBeenCalled();
  });
});
