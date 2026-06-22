import { act, fireEvent, waitFor } from '@testing-library/react-native';

import TripPlannerScreen from '../[id]';
import type { LocationWithPhotos } from '@/db/repository';
import type { TripWithDays } from '@/db/trips-repository';
import { UITestHelper } from '@/test/UITestHelper';

const mockGetTrip = jest.fn();
const mockInsertDayEvent = jest.fn();
const mockCreateDetailEvent = jest.fn();
const mockAddDetailEventPhoto = jest.fn();
const mockUpdateTripStartDate = jest.fn();
const mockDuplicateTrip = jest.fn();
const mockListLocationsWithPhotos = jest.fn();
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
let mockFocusEffect: (() => void | (() => void)) | null = null;

jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    LinearGradient: (props: unknown) => <View {...(props as object)} />,
  };
});

jest.mock('@appandflow/react-native-google-autocomplete', () => ({
  useGoogleAutocomplete: () => ({
    clearSearch: jest.fn(),
    isSearching: false,
    locationResults: [],
    searchDetails: jest.fn(),
    searchError: null,
    setTerm: jest.fn(),
    term: '',
  }),
}));

jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
}));

jest.mock('react-native-calendars', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    Calendar: ({ onDayPress }: { onDayPress: (day: { dateString: string }) => void }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select June 24"
        onPress={() => onDayPress({ dateString: '2026-06-24' })}>
        <Text>Calendar mock</Text>
      </Pressable>
    ),
  };
});

jest.mock('@/db/database-provider', () => ({
  useDatabase: () => ({
    reader: {
      listLocationsWithPhotos: (...args: unknown[]) => mockListLocationsWithPhotos(...args),
    },
    tripsReader: {
      getTrip: (...args: unknown[]) => mockGetTrip(...args),
    },
    tripsWriter: {
      addDetailEventPhoto: (...args: unknown[]) => mockAddDetailEventPhoto(...args),
      createDetailEvent: (...args: unknown[]) => mockCreateDetailEvent(...args),
      duplicateTrip: (...args: unknown[]) => mockDuplicateTrip(...args),
      insertDayEvent: (...args: unknown[]) => mockInsertDayEvent(...args),
      updateTripStartDate: (...args: unknown[]) => mockUpdateTripStartDate(...args),
    },
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockRouterPush(...args),
    replace: (...args: unknown[]) => mockRouterReplace(...args),
  },
  Stack: {
    Screen: ({ options }: { options?: { headerRight?: () => React.ReactNode } }) => <>{options?.headerRight?.()}</>,
  },
  useFocusEffect: (effect: () => void | (() => void)) => {
    mockFocusEffect = effect;
  },
  useLocalSearchParams: () => ({ id: 'trip-1' }),
}));

describe('TripPlannerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockFocusEffect = null;
    mockGetTrip.mockResolvedValue(trip());
    mockListLocationsWithPhotos.mockResolvedValue([location()]);
    mockInsertDayEvent.mockResolvedValue(undefined);
    mockCreateDetailEvent.mockResolvedValue({ id: 'detail-created' });
    mockAddDetailEventPhoto.mockResolvedValue(undefined);
    mockUpdateTripStartDate.mockResolvedValue(undefined);
    mockDuplicateTrip.mockResolvedValue({ id: 'trip-copy' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('loads a trip and inserts day events from timeline controls', async () => {
    const screen = await UITestHelper.renderWithPaper(<TripPlannerScreen />);

    await act(async () => {
      mockFocusEffect?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText('Kyoto')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Insert day at position 2'));
    });

    await waitFor(() => {
      expect(mockInsertDayEvent).toHaveBeenCalledWith({ tripId: 'trip-1', index: 1 });
    });
    expect(mockGetTrip).toHaveBeenCalledWith('trip-1');
  });

  test('opens detail form after a timeline tap and saves the detail event', async () => {
    const screen = await UITestHelper.renderWithPaper(<TripPlannerScreen />);

    await act(async () => {
      mockFocusEffect?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('timeline-day-row-day-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('timeline-day-row-day-1'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('hourly-timeline-day-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('hourly-timeline-day-1'), {
        nativeEvent: { locationY: 85 },
      });
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText('Detail Event')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('detail-event-title-input'), 'Coffee');
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Save'));
    });

    await waitFor(() => {
      expect(mockCreateDetailEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          dayEventId: 'day-1',
          startMinute: 30,
          title: 'Coffee',
        })
      );
    });
  });

  test('sets the trip start date from the calendar picker', async () => {
    const screen = await UITestHelper.renderWithPaper(<TripPlannerScreen />);

    await act(async () => {
      mockFocusEffect?.();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByText('Kyoto')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('...'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Set Start Date'));
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Select June 24'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Save'));
    });

    await waitFor(() => {
      expect(mockUpdateTripStartDate).toHaveBeenCalledWith('trip-1', '2026-06-24');
    });
  });

  test('duplicates the trip from the header menu', async () => {
    const screen = await UITestHelper.renderWithPaper(<TripPlannerScreen />);

    await act(async () => {
      mockFocusEffect?.();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByText('Kyoto')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('...'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Duplicate Trip'));
    });

    await waitFor(() => {
      expect(mockDuplicateTrip).toHaveBeenCalledWith({ id: 'trip-1', title: 'Kyoto Copy' });
    });
    expect(mockRouterPush).toHaveBeenCalledWith({ pathname: '/trips/[id]', params: { id: 'trip-copy' } });
  });
});

function trip(overrides: Partial<TripWithDays> = {}): TripWithDays {
  const baseDate = new Date('2026-06-22T12:00:00.000Z');

  return {
    coverPhotoUri: null,
    createdAt: baseDate,
    dayEvents: [
      {
        createdAt: baseDate,
        description: 'Arrival day',
        detailEvents: [],
        id: 'day-1',
        photoUri: null,
        position: 0,
        title: null,
        tripId: 'trip-1',
        updatedAt: baseDate,
      },
    ],
    id: 'trip-1',
    kind: 'local',
    sourceTripId: null,
    startDate: null,
    syncStatus: 'local',
    title: 'Kyoto',
    updatedAt: baseDate,
    ...overrides,
  };
}

function location(overrides: Partial<LocationWithPhotos> = {}): LocationWithPhotos {
  const baseDate = new Date('2026-06-22T12:00:00.000Z');

  return {
    addedAt: baseDate,
    category: 'cafe',
    country: 'Japan',
    createdAt: baseDate,
    fieldConfidenceJson: null,
    googleMapsUrl: null,
    id: 'location-1',
    instagramFeedUrl: null,
    instagramUrl: null,
    latitude: null,
    localLocationId: 'local-1',
    localStatus: 'matched',
    longitude: null,
    name: 'Kyoto Station',
    notes: null,
    photos: [],
    trailMapUrl: null,
    updatedAt: baseDate,
    ...overrides,
  };
}
