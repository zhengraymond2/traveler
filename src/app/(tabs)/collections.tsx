import { router, Stack, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput, useTheme } from 'react-native-paper';

import { PulsingView } from '@/components/pulsing-view';
import { AppColors } from '@/constants/theme';
import { useDatabase } from '@/db/database-provider';
import type { CollectionKind } from '@/db/schema';
import type { SavedCollectionWithLocations } from '@/db/repository';
import { getCollectionRows, type CollectionRow } from '@/features/collections/collection-rows';

export default function CollectionsScreen() {
  const theme = useTheme();
  const { reader, writer } = useDatabase();
  const [collections, setCollections] = React.useState<SavedCollectionWithLocations[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isCreateDialogVisible, setIsCreateDialogVisible] = React.useState(false);
  const [createCollectionKind, setCreateCollectionKind] = React.useState<CollectionKind>('local');
  const [newCollectionTitle, setNewCollectionTitle] = React.useState('');

  const collectionRows = React.useMemo(() => getCollectionRows(collections), [collections]);
  const localRows = collectionRows.filter((collection) => collection.kind === 'local');
  const sharedRows = collectionRows.filter((collection) => collection.kind === 'shared');

  const loadCollections = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      setCollections(await reader.listCollectionsWithLocations());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load collections.');
    } finally {
      setIsLoading(false);
    }
  }, [reader]);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      async function loadActiveCollections() {
        setIsLoading(true);
        setErrorMessage(null);

        try {
          const savedCollections = await reader.listCollectionsWithLocations();
          if (isActive) {
            setCollections(savedCollections);
          }
        } catch (error) {
          if (isActive) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to load collections.');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      loadActiveCollections();

      return () => {
        isActive = false;
      };
    }, [reader])
  );

  function openCreateDialog(kind: CollectionKind) {
    setCreateCollectionKind(kind);
    setNewCollectionTitle('');
    setIsCreateDialogVisible(true);
  }

  function closeCreateDialog() {
    setIsCreateDialogVisible(false);
    setNewCollectionTitle('');
  }

  async function handleCreateCollection() {
    try {
      const collection = await writer.createCollection({ title: newCollectionTitle, kind: createCollectionKind });
      closeCreateDialog();
      router.push({ pathname: '/collections/[id]', params: { id: collection.id } });
      await loadCollections();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create collection.');
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Collections' }} />
      <ScrollView
        testID="collections-screen"
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        {errorMessage ? (
          <Text selectable variant="bodyMedium" style={{ color: theme.colors.error }}>
            {errorMessage}
          </Text>
        ) : null}

        <CollectionSectionHeader
          buttonLabel="Create regular collection"
          testID="collections-section-header-local"
          title="Collections"
          onCreate={() => openCreateDialog('local')}
        />

        {!isLoading && localRows.length === 0 ? (
          <Text selectable variant="bodyMedium" style={styles.emptyText}>
            No collections yet.
          </Text>
        ) : null}

        {isLoading && collectionRows.length === 0 ? <LoadingCollectionRows /> : null}

        <CollectionGallery collections={localRows} isLoading={isLoading} />

        <CollectionSectionHeader
          buttonLabel="Create shared collection"
          testID="collections-section-header-shared"
          title="Shared Collections"
          variant="muted"
          onCreate={() => openCreateDialog('shared')}
        />

        <CollectionGallery collections={sharedRows} isLoading={isLoading} shared />
      </ScrollView>

      <Portal>
        <Dialog visible={isCreateDialogVisible} onDismiss={closeCreateDialog}>
          <Dialog.Title>{createCollectionKind === 'shared' ? 'Create Shared Collection' : 'Create Collection'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              autoFocus
              testID="collection-title-input"
              mode="outlined"
              label="Collection name"
              value={newCollectionTitle}
              onChangeText={setNewCollectionTitle}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeCreateDialog}>Cancel</Button>
            <Button disabled={!newCollectionTitle.trim()} onPress={handleCreateCollection}>
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

function CollectionSectionHeader({
  buttonLabel,
  onCreate,
  testID,
  title,
  variant = 'default',
}: {
  buttonLabel: string;
  onCreate: () => void;
  testID: string;
  title: string;
  variant?: 'default' | 'muted';
}) {
  return (
    <View testID={testID} style={styles.sectionHeader}>
      <Text
        selectable={false}
        variant="headlineSmall"
        numberOfLines={1}
        style={[styles.sectionHeading, variant === 'muted' && styles.sharedHeading]}>
        {title}
      </Text>
      <Pressable
        accessibilityLabel={buttonLabel}
        accessibilityRole="button"
        style={styles.createIconButton}
        onPress={onCreate}>
        <Text selectable={false} variant="titleLarge" style={styles.createIcon}>
          +
        </Text>
      </Pressable>
    </View>
  );
}

function CollectionGallery({
  collections,
  isLoading,
  shared = false,
}: {
  collections: CollectionRow[];
  isLoading: boolean;
  shared?: boolean;
}) {
  return (
    <View style={styles.galleryGrid}>
      {collections.map((collection) => (
        <CollectionGalleryCard key={collection.id} collection={collection} isLoading={isLoading} shared={shared} />
      ))}
    </View>
  );
}

function CollectionGalleryCard({
  collection,
  isLoading,
  shared,
}: {
  collection: CollectionRow;
  isLoading: boolean;
  shared: boolean;
}) {
  return (
    <View style={styles.galleryCard} testID={`collection-gallery-card-${collection.id}`}>
      <PulsingView active={isLoading}>
        <Pressable
          accessibilityLabel={`${shared ? 'Open shared collection' : 'Open collection'} ${collection.title}`}
          accessibilityRole="button"
          disabled={isLoading}
          style={styles.galleryPressable}
          onPress={() => router.push({ pathname: '/collections/[id]', params: { id: collection.id } })}>
          <CollectionCover collection={collection} />
          <Text selectable={false} variant="titleSmall" numberOfLines={2} style={styles.galleryTitle}>
            {collection.title}
          </Text>
        </Pressable>
      </PulsingView>
    </View>
  );
}

function CollectionCover({ collection }: { collection: CollectionRow }) {
  return (
    <View testID={`collection-gallery-cover-${collection.id}`} style={styles.galleryCover}>
      {Array.from({ length: 4 }).map((_, index) => {
        const uri = collection.imageUris[index];

        return (
          <View key={index} style={styles.galleryTileSlot}>
            {uri ? (
              <Image source={{ uri }} style={styles.galleryTile} contentFit="cover" />
            ) : (
              <View style={[styles.galleryTile, styles.galleryTileFallback]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

function LoadingCollectionRows() {
  return (
    <View style={styles.skeletonContent}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.galleryCard}>
          <PulsingView active>
            <View style={styles.skeletonCover}>
              <View style={styles.skeletonLine} />
            </View>
          </PulsingView>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    gap: 12,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  sectionHeading: {
    flex: 1,
    color: AppColors.text,
    fontWeight: '800',
  },
  createIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.text,
    boxShadow: `0 2px 7px ${AppColors.navShadow}`,
  },
  createIcon: {
    color: AppColors.textInverse,
    fontWeight: '700',
    lineHeight: 26,
  },
  emptyText: {
    paddingHorizontal: 16,
    color: AppColors.textMuted,
  },
  sharedHeading: {
    color: AppColors.textMuted,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    rowGap: 18,
  },
  skeletonContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    rowGap: 18,
  },
  galleryCard: {
    width: '50%',
    paddingHorizontal: 4,
  },
  galleryPressable: {
    gap: 7,
  },
  galleryCover: {
    aspectRatio: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: AppColors.imageFallback,
    borderCurve: 'continuous',
  },
  galleryTileSlot: {
    width: '50%',
    height: '50%',
    padding: 1,
  },
  galleryTile: {
    width: '100%',
    height: '100%',
    backgroundColor: AppColors.surfaceVariant,
  },
  galleryTileFallback: {
    backgroundColor: AppColors.imageFallback,
  },
  galleryTitle: {
    color: AppColors.text,
    fontWeight: '700',
    lineHeight: 18,
  },
  skeletonCover: {
    aspectRatio: 1,
    borderRadius: 4,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: AppColors.surfaceMuted,
    borderCurve: 'continuous',
  },
  skeletonLine: {
    width: '56%',
    height: 14,
    borderRadius: 6,
    backgroundColor: AppColors.surface,
  },
});
