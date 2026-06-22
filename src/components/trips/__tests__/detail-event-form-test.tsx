import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { DetailEventForm } from '../detail-event-form';
import { UITestHelper } from '@/test/UITestHelper';

const mockOpenURL = jest.fn().mockResolvedValue(true);

jest.mock('expo-linking', () => ({
  openURL: (...args: unknown[]) => mockOpenURL(...args),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
}));

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

describe('DetailEventForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initializes from the tapped one-hour time window', async () => {
    const screen = await UITestHelper.renderWithPaper(
      <DetailEventForm
        draft={{ dayEventId: 'day-1', startMinute: 30, endMinute: 90 }}
        savedLocations={[]}
        visible
        onCancel={jest.fn()}
        onSave={jest.fn()}
      />
    );

    expect(screen.getByDisplayValue('00:30')).toBeTruthy();
    expect(screen.getByDisplayValue('01:30')).toBeTruthy();
  });

  test('turns selected categories into matching chips', async () => {
    const screen = await UITestHelper.renderWithPaper(
      <DetailEventForm
        draft={{ dayEventId: 'day-1', startMinute: 30, endMinute: 90 }}
        savedLocations={[]}
        visible
        onCancel={jest.fn()}
        onSave={jest.fn()}
      />
    );

    await act(async () => {
      fireEvent.press(screen.getByText('Category'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Cafe'));
    });

    expect(screen.getByText('Cafe')).toBeTruthy();
    expect(screen.getByText('☕')).toBeTruthy();
  });

  test('makes saved locations and address entry mutually exclusive', async () => {
    const screen = await UITestHelper.renderWithPaper(
      <DetailEventForm
        draft={{ dayEventId: 'day-1', startMinute: 30, endMinute: 90 }}
        savedLocations={[
          {
            googleMapsUrl: 'https://maps.google.com/?q=kyoto',
            id: 'location-1',
            name: 'Kyoto Station',
          },
        ]}
        visible
        onCancel={jest.fn()}
        onSave={jest.fn()}
      />
    );

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('saved-location-search-input'), 'Kyoto');
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Kyoto Station'));
    });

    expect(screen.getByTestId('address-picker-input').props.editable).toBe(false);

    await act(async () => {
      fireEvent.press(screen.getByText('Clear location'));
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('address-picker-input'), 'Senso-ji Tokyo');
    });

    expect(screen.getByTestId('saved-location-search-input').props.editable).toBe(false);
  });

  test('opens the maps badge URL and saves form data', async () => {
    const onSave = jest.fn();
    const screen = await UITestHelper.renderWithPaper(
      <DetailEventForm
        draft={{ dayEventId: 'day-1', startMinute: 30, endMinute: 90 }}
        savedLocations={[
          {
            googleMapsUrl: null,
            id: 'location-1',
            name: 'Mont Saint Michel',
          },
        ]}
        visible
        onCancel={jest.fn()}
        onSave={onSave}
      />
    );

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('detail-event-title-input'), 'Sunrise');
      fireEvent.changeText(screen.getByTestId('saved-location-search-input'), 'Mont');
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Mont Saint Michel'));
    });

    await act(async () => {
      fireEvent.press(screen.getByText('navigate on maps'));
    });
    expect(mockOpenURL).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=Mont%20Saint%20Michel'
    );

    await act(async () => {
      fireEvent.press(screen.getByText('Save'));
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          dayEventId: 'day-1',
          locationId: 'location-1',
          startMinute: 30,
          title: 'Sunrise',
        })
      );
    });
  });
});
