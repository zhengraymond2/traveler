import { act, fireEvent, waitFor } from '@testing-library/react-native';

import ProfileScreen from '../profile';
import { UITestHelper } from '@/test/UITestHelper';

const mockUseAuth = jest.fn();
const mockRouterPush = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();
const mockGetDocumentAsync = jest.fn();

jest.mock('@/auth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockRouterPush(...args),
  },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: (...args: unknown[]) => mockRequestMediaLibraryPermissionsAsync(...args),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('ProfileScreen', () => {
  const mockSignIn = jest.fn();
  const mockSignOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      activeProvider: null,
      isProviderAvailable: jest.fn(() => true),
      signIn: mockSignIn,
      signOut: mockSignOut,
      status: 'idle',
      user: {
        displayName: 'Raymond Z',
        email: 'zhray@example.com',
      },
    });
  });

  test('shows a profile header and grouped settings sections', async () => {
    const screen = await UITestHelper.renderWithPaper(<ProfileScreen />);

    expect(screen.getByText('Raymond Z')).toBeTruthy();
    expect(screen.getByText('@zhray')).toBeTruthy();
    expect(screen.getByText('Import/Export')).toBeTruthy();
    expect(screen.getByText('Export Data')).toBeTruthy();
    expect(screen.getByText('Import Data from Images')).toBeTruthy();
    expect(screen.getByText('Import Data from Instagram JSON')).toBeTruthy();
    expect(screen.getByText('Friends')).toBeTruthy();
    expect(screen.getByText('Add Friends')).toBeTruthy();
    expect(screen.getByText('Help')).toBeTruthy();
    expect(screen.getByText('About Us')).toBeTruthy();
    expect(screen.getByText('Contact')).toBeTruthy();
    expect(screen.getByText('Login')).toBeTruthy();
    expect(screen.getByText('Connect Google')).toBeTruthy();
    expect(screen.getByText('Connect Instagram')).toBeTruthy();
    expect(screen.getByText('Connect Apple')).toBeTruthy();
    expect(screen.getByText('Logout')).toBeTruthy();
  });

  test('falls back to a display-name username when email is unavailable', async () => {
    mockUseAuth.mockReturnValue({
      activeProvider: null,
      isProviderAvailable: jest.fn(() => true),
      signIn: mockSignIn,
      signOut: mockSignOut,
      status: 'idle',
      user: {
        displayName: 'Raymond Z',
      },
    });

    const screen = await UITestHelper.renderWithPaper(<ProfileScreen />);

    expect(screen.getByText('@raymondz')).toBeTruthy();
  });

  test('routes help items to existing help screens', async () => {
    const screen = await UITestHelper.renderWithPaper(<ProfileScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('About Us'));
      await flushAsyncWork();
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Contact'));
      await flushAsyncWork();
    });

    expect(mockRouterPush).toHaveBeenCalledWith('/about-traveler');
    expect(mockRouterPush).toHaveBeenCalledWith('/support');
  });

  test('stubs friends and Instagram connection actions', async () => {
    const screen = await UITestHelper.renderWithPaper(<ProfileScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Add Friends'));
      await flushAsyncWork();
    });
    expect(screen.getByText('Friend invites are coming soon.')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Connect Instagram'));
      await flushAsyncWork();
    });
    expect(screen.getByText('Instagram connection is coming soon.')).toBeTruthy();
  });

  test('connects supported auth providers and logs out', async () => {
    mockSignIn.mockResolvedValue({ displayName: 'Raymond Z' });
    const screen = await UITestHelper.renderWithPaper(<ProfileScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Connect Google'));
      await flushAsyncWork();
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Connect Apple'));
      await flushAsyncWork();
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Logout'));
      await flushAsyncWork();
    });

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('google');
      expect(mockSignIn).toHaveBeenCalledWith('apple');
    });
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  test('opens the native image picker for image imports', async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      assets: [{ uri: 'file:///one.jpg' }, { uri: 'file:///two.jpg' }],
      canceled: false,
    });
    const screen = await UITestHelper.renderWithPaper(<ProfileScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Import Data from Images'));
      await flushAsyncWork();
    });

    await waitFor(() => {
      expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith({
        allowsMultipleSelection: true,
        mediaTypes: ['images'],
        orderedSelection: true,
        quality: 0.9,
        selectionLimit: 0,
      });
    });
    expect(screen.getByText('Selected 2 images for import.')).toBeTruthy();
  });

  test('shows an error when image permissions are denied', async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });
    const screen = await UITestHelper.renderWithPaper(<ProfileScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Import Data from Images'));
      await flushAsyncWork();
    });

    await waitFor(() => {
      expect(screen.getByText('Photo library permission is required to import images.')).toBeTruthy();
    });
    expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
  });

  test('opens the document picker for Instagram JSON imports', async () => {
    mockGetDocumentAsync.mockResolvedValue({
      assets: [{ name: 'instagram-data.json', uri: 'file:///instagram-data.json' }],
      canceled: false,
    });
    const screen = await UITestHelper.renderWithPaper(<ProfileScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Import Data from Instagram JSON'));
      await flushAsyncWork();
    });

    await waitFor(() => {
      expect(mockGetDocumentAsync).toHaveBeenCalledWith({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['application/json', 'text/json'],
      });
    });
    expect(screen.getByText('Selected instagram-data.json for Instagram import.')).toBeTruthy();
  });

});
