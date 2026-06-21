import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import CollectionsScreen from '../collections';
import { AppColors } from '@/constants/theme';
import { DbTestHelper } from '@/test/DbTestHelper';
import { UITestHelper } from '@/test/UITestHelper';

const mockListCollectionsWithLocations = jest.fn();
const mockCreateCollection = jest.fn();
const mockRouterPush = jest.fn();
let mockFocusEffect: (() => void | (() => void)) | null = null;

jest.mock('@/db/database-provider', () => ({
  useDatabase: () => ({
    reader: {
      listCollectionsWithLocations: (...args: unknown[]) => mockListCollectionsWithLocations(...args),
    },
    writer: {
      createCollection: (...args: unknown[]) => mockCreateCollection(...args),
    },
  }),
}));

jest.mock('@/components/image-list-row', () => ({
  ImageListRow: () => null,
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

describe('CollectionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFocusEffect = null;
    mockListCollectionsWithLocations.mockResolvedValue([]);
    mockCreateCollection.mockResolvedValue({ id: 'created-collection' });
  });

  test('shows collection sections and a plain empty state without the create row', async () => {
    const screen = await UITestHelper.renderWithPaper(<CollectionsScreen />);

    await act(async () => {
      mockFocusEffect?.();
      await Promise.resolve();
    });

    let emptyState = screen.getByText('No collections yet.');
    await waitFor(() => {
      emptyState = screen.getByText('No collections yet.');
    });

    expect(screen.getByText('Collections')).toBeTruthy();
    expect(screen.getByText('Shared Collections')).toBeTruthy();
    expect(screen.getByLabelText('Create regular collection')).toBeTruthy();
    expect(screen.getByLabelText('Create shared collection')).toBeTruthy();
    expect(screen.queryByText('+ Create a new Collection')).toBeNull();
    expect(emptyState).toHaveStyle({ color: AppColors.textMuted });
    expect(screen.queryByTestId('collections-empty-card')).toBeNull();
  });

  test('renders local and shared collections as two-column gallery cards with titles below covers', async () => {
    mockListCollectionsWithLocations.mockResolvedValue([
      {
        id: 'local-1',
        title: 'Weekend',
        kind: 'local',
        sourceCollectionId: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        locations: [
          DbTestHelper.locationWithPhotos({
            id: 'location-1',
            photos: [DbTestHelper.locationPhoto({ uri: 'file:///weekend.jpg' })],
          }),
        ],
      },
      {
        id: 'shared-1',
        title: 'Friends',
        kind: 'shared',
        sourceCollectionId: null,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        locations: [],
      },
    ]);

    const screen = await UITestHelper.renderWithPaper(<CollectionsScreen />);

    await act(async () => {
      mockFocusEffect?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('collection-gallery-card-local-1')).toBeTruthy();
    });

    expect(StyleSheet.flatten(screen.getByTestId('collections-section-header-local').props.style)).toMatchObject({
      alignItems: 'center',
      flexDirection: 'row',
    });
    expect(StyleSheet.flatten(screen.getByTestId('collection-gallery-card-local-1').props.style)).toMatchObject({
      width: '50%',
    });
    expect(StyleSheet.flatten(screen.getByTestId('collection-gallery-cover-local-1').props.style)).toMatchObject({
      aspectRatio: 1,
    });
    expect(screen.getByText('Weekend')).toBeTruthy();
    expect(screen.getByTestId('collection-gallery-card-shared-1')).toBeTruthy();
    expect(screen.getByText('Friends')).toBeTruthy();
  });

  test('creates shared collections from the shared section plus button', async () => {
    const screen = await UITestHelper.renderWithPaper(<CollectionsScreen />);

    await act(async () => {
      mockFocusEffect?.();
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Create shared collection'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('collection-title-input')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('collection-title-input'), 'Group Trip');
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Create'));
    });

    await waitFor(() => {
      expect(mockCreateCollection).toHaveBeenCalledWith({ title: 'Group Trip', kind: 'shared' });
    });
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith({
        pathname: '/collections/[id]',
        params: { id: 'created-collection' },
      });
    });
  });
});
