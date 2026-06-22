import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { DetailEventFormContent } from '../detail-event-form';
import { UITestHelper } from '@/test/UITestHelper';

const mockOpenURL = jest.fn();

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

jest.mock('react-native-paper', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const ReactNative = jest.requireActual<typeof import('react-native')>('react-native');

  const Button = ({
    children,
    disabled,
    onPress,
    ...props
  }: import('react-native').PressableProps & {
    children?: import('react').ReactNode;
    compact?: boolean;
    mode?: string;
  }) =>
    React.createElement(
      ReactNative.Pressable,
      {
        ...props,
        accessibilityRole: 'button',
        accessibilityState: { disabled: Boolean(disabled) },
        disabled,
        onPress,
      },
      React.createElement(ReactNative.Text, null, children)
    );

  const Text = ({
    children,
    selectable: _selectable,
    variant: _variant,
    ...props
  }: import('react-native').TextProps & {
    children?: import('react').ReactNode;
    selectable?: boolean;
    variant?: string;
  }) =>
    React.createElement(ReactNative.Text, props, children);

  const TextInput = ({
    label,
    mode: _mode,
    ...props
  }: import('react-native').TextInputProps & {
    label?: string;
    mode?: string;
  }) =>
    React.createElement(ReactNative.TextInput, {
      accessibilityLabel: label,
      placeholder: label,
      ...props,
    });

  const Dialog = Object.assign(
    ({
      children,
      visible = true,
    }: {
      children?: import('react').ReactNode;
      onDismiss?: () => void;
      visible?: boolean;
    }) => (visible ? React.createElement(ReactNative.View, null, children) : null),
    {
      Actions: ({ children }: { children?: import('react').ReactNode }) =>
        React.createElement(ReactNative.View, null, children),
      ScrollArea: ({ children }: { children?: import('react').ReactNode }) =>
        React.createElement(ReactNative.View, null, children),
      Title: ({ children }: { children?: import('react').ReactNode }) =>
        React.createElement(ReactNative.View, { accessibilityRole: 'header' }, children),
    }
  );

  return {
    Button,
    Dialog,
    MD3LightTheme: {
      colors: {},
    },
    PaperProvider: ({ children }: { children?: import('react').ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    Portal: ({ children }: { children?: import('react').ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    Text,
    TextInput,
  };
});

describe('DetailEventForm', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      if (String(args[0]).includes('overlapping act() calls')) {
        throw new Error(String(args[0]));
      }
    });
  });

  afterEach(() => {
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('overlapping act() calls'));
    consoleErrorSpy.mockRestore();
  });

  test('initializes from the tapped one-hour time window', async () => {
    const screen = await UITestHelper.renderWithPaper(
      <DetailEventFormContent
        draft={{ dayEventId: 'day-1', startMinute: 30, endMinute: 90 }}
        savedLocations={[]}
        onCancel={jest.fn()}
        onSave={jest.fn()}
      />
    );

    expect(screen.getByDisplayValue('00:30')).toBeTruthy();
    expect(screen.getByDisplayValue('01:30')).toBeTruthy();
  });

  test('turns selected categories into matching chips', async () => {
    const screen = await UITestHelper.renderWithPaper(
      <DetailEventFormContent
        draft={{ dayEventId: 'day-1', startMinute: 30, endMinute: 90 }}
        savedLocations={[]}
        onCancel={jest.fn()}
        onSave={jest.fn()}
      />
    );

    fireEvent.press(screen.getByText('Category'));
    await waitFor(() => {
      expect(screen.getByText('Cafe')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Cafe'));

    expect(screen.getByText('Cafe')).toBeTruthy();
    expect(screen.getByText('☕')).toBeTruthy();
  });

  test('makes saved locations and address entry mutually exclusive', async () => {
    const screen = await UITestHelper.renderWithPaper(
      <DetailEventFormContent
        draft={{ dayEventId: 'day-1', startMinute: 30, endMinute: 90 }}
        savedLocations={[
          {
            googleMapsUrl: 'https://maps.google.com/?q=kyoto',
            id: 'location-1',
            name: 'Kyoto Station',
          },
        ]}
        onCancel={jest.fn()}
        onSave={jest.fn()}
      />
    );

    fireEvent.changeText(screen.getByTestId('saved-location-search-input'), 'Kyoto');
    await waitFor(() => {
      expect(screen.getByText('Kyoto Station')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('saved-location-result-location-1'));

    await waitFor(() => {
      expect(screen.getByTestId('address-picker-input').props.editable).toBe(false);
    });

    fireEvent.press(screen.getByText('Clear location'));
    await waitFor(() => {
      expect(screen.getByTestId('address-picker-input').props.editable).toBe(true);
    });
    fireEvent.changeText(screen.getByTestId('address-picker-input'), 'Senso-ji Tokyo');

    await waitFor(() => {
      expect(screen.getByTestId('saved-location-search-input').props.editable).toBe(false);
    });
  });

  test('opens the maps badge URL and saves form data', async () => {
    const onSave = jest.fn();
    const googleMapsUrl = 'https://www.google.com/maps/place/Mont+Saint-Michel';
    const screen = await UITestHelper.renderWithPaper(
      <DetailEventFormContent
        draft={{ dayEventId: 'day-1', startMinute: 30, endMinute: 90 }}
        savedLocations={[]}
        onCancel={jest.fn()}
        onSave={onSave}
      />
    );

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('detail-event-title-input'), 'Sunrise');
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByDisplayValue('Sunrise')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('address-picker-input'), googleMapsUrl);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText('navigate on maps')).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(screen.getByText('navigate on maps'));
      await Promise.resolve();
    });
    expect(mockOpenURL).toHaveBeenCalledWith(googleMapsUrl);

    await act(async () => {
      fireEvent.press(screen.getByText('Save'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          addressText: googleMapsUrl,
          dayEventId: 'day-1',
          googleMapsUrl,
          locationId: null,
          startMinute: 30,
          title: 'Sunrise',
        })
      );
    });
  });
});
