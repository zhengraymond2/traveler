import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import TripsScreen from '../trips';
import { AppColors } from '@/constants/theme';
import type { TripWithDays } from '@/db/trips-repository';
import { UITestHelper } from '@/test/UITestHelper';

const mockListTripsWithDays = jest.fn();
const mockCreateTrip = jest.fn();
const mockRouterPush = jest.fn();
let mockFocusEffect: (() => void | (() => void)) | null = null;

jest.mock('@/db/database-provider', () => ({
  useDatabase: () => ({
    tripsReader: {
      listTripsWithDays: (...args: unknown[]) => mockListTripsWithDays(...args),
    },
    tripsWriter: {
      createTrip: (...args: unknown[]) => mockCreateTrip(...args),
    },
  }),
}));

jest.mock('expo-image', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    Image: (props: unknown) => <View {...(props as object)} />,
  };
});

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockRouterPush(...args),
  },
  Stack: {
    Screen: () => null,
  },
  useFocusEffect: (effect: () => void | (() => void)) => {
    mockFocusEffect = effect;
  },
}));

describe('TripsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFocusEffect = null;
    mockListTripsWithDays.mockResolvedValue([]);
    mockCreateTrip.mockResolvedValue({ id: 'created-trip' });
  });

  test('shows trip sections and a muted empty state', async () => {
    const screen = await UITestHelper.renderWithPaper(<TripsScreen />);

    await act(async () => {
      mockFocusEffect?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText('No trips yet.')).toBeTruthy();
    });

    expect(screen.getByText('Trips')).toBeTruthy();
    expect(screen.getByText('Shared Trips')).toBeTruthy();
    expect(screen.getByLabelText('Create trip')).toBeTruthy();
    expect(screen.getByLabelText('Create shared trip')).toBeTruthy();
    expect(screen.getByText('No trips yet.')).toHaveStyle({ color: AppColors.textMuted });
  });

  test('renders local and shared trips as two-column gallery cards', async () => {
    mockListTripsWithDays.mockResolvedValue([
      trip({ id: 'local-1', title: 'Kyoto', kind: 'local', coverPhotoUri: 'file:///kyoto.jpg' }),
      trip({ id: 'shared-1', title: 'Friends', kind: 'shared' }),
    ]);

    const screen = await UITestHelper.renderWithPaper(<TripsScreen />);

    await act(async () => {
      mockFocusEffect?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('trip-gallery-card-local-1')).toBeTruthy();
    });

    expect(StyleSheet.flatten(screen.getByTestId('trips-section-header-local').props.style)).toMatchObject({
      alignItems: 'center',
      flexDirection: 'row',
    });
    expect(StyleSheet.flatten(screen.getByTestId('trip-gallery-card-local-1').props.style)).toMatchObject({
      width: '50%',
    });
    expect(StyleSheet.flatten(screen.getByTestId('trip-gallery-cover-local-1').props.style)).toMatchObject({
      aspectRatio: 1,
    });
    expect(screen.getByText('Kyoto')).toBeTruthy();
    expect(screen.getByTestId('trip-gallery-card-shared-1')).toBeTruthy();
    expect(screen.getByText('Friends')).toBeTruthy();
  });

  test('opens TripPlanner when a trip card is pressed', async () => {
    mockListTripsWithDays.mockResolvedValue([trip({ id: 'local-1', title: 'Kyoto' })]);

    const screen = await UITestHelper.renderWithPaper(<TripsScreen />);

    await act(async () => {
      mockFocusEffect?.();
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Open trip Kyoto'));
    });

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/trips/[id]',
      params: { id: 'local-1' },
    });
  });

  test('creates shared trips from the shared section plus button', async () => {
    const screen = await UITestHelper.renderWithPaper(<TripsScreen />);

    await act(async () => {
      mockFocusEffect?.();
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Create shared trip'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('trip-title-input')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('trip-title-input'), 'Group Trip');
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Create'));
    });

    await waitFor(() => {
      expect(mockCreateTrip).toHaveBeenCalledWith({ title: 'Group Trip', kind: 'shared' });
    });
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith({
        pathname: '/trips/[id]',
        params: { id: 'created-trip' },
      });
    });
  });
});

function trip(overrides: Partial<TripWithDays> = {}): TripWithDays {
  const baseDate = new Date('2026-06-22T12:00:00.000Z');

  return {
    coverPhotoUri: null,
    createdAt: baseDate,
    dayEvents: [],
    id: 'trip-1',
    kind: 'local',
    sourceTripId: null,
    startDate: null,
    syncStatus: 'local',
    title: 'Weekend',
    updatedAt: baseDate,
    ...overrides,
  };
}
