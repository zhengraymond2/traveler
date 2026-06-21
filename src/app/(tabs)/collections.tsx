import { router, Stack, useFocusEffect } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Dialog, Portal, Text, TextInput, useTheme } from 'react-native-paper';

import { ImageListRow } from '@/components/image-list-row';
import { PulsingView } from '@/components/pulsing-view';
import { AppColors } from '@/constants/theme';
import { useDatabase } from '@/db/database-provider';
import type { SavedCollectionWithLocations } from '@/db/repository';
import { getCollectionRows } from '@/features/collections/collection-rows';

export default function CollectionsScreen() {
  const theme = useTheme();
  const { reader, writer } = useDatabase();
  const [collections, setCollections] = React.useState<SavedCollectionWithLocations[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isCreateDialogVisible, setIsCreateDialogVisible] = React.useState(false);
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

  async function handleCreateCollection() {
    try {
      const collection = await writer.createCollection({ title: newCollectionTitle });
      setNewCollectionTitle('');
      setIsCreateDialogVisible(false);
      await loadCollections();
      router.push({ pathname: '/collections/[id]', params: { id: collection.id } });
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

        <Pressable
          accessibilityLabel="Create a new Collection"
          accessibilityRole="button"
          style={styles.createRow}
          onPress={() => setIsCreateDialogVisible(true)}>
          <Text selectable={false} variant="headlineSmall" numberOfLines={1} style={styles.createTitle}>
            Create a new Collection
          </Text>
        </Pressable>

        {!isLoading && localRows.length === 0 ? (
          <Card mode="outlined" style={styles.emptyCard}>
            <Card.Content>
              <Text selectable variant="bodyMedium">
                No collections yet.
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        {isLoading && collectionRows.length === 0 ? <LoadingCollectionRows /> : null}

        {localRows.map((collection) => (
          <PulsingView key={collection.id} active={isLoading}>
            <ImageListRow
              accessibilityLabel={`Open ${collection.title}`}
              imageUri={collection.imageUri}
              isLoading={isLoading}
              testID={`collection-row-${collection.id}`}
              title={collection.title}
              onPress={() => router.push({ pathname: '/collections/[id]', params: { id: collection.id } })}
            />
          </PulsingView>
        ))}

        <Text selectable={false} variant="titleSmall" style={styles.sharedHeading}>
          Shared Collections
        </Text>

        {sharedRows.map((collection) => (
          <PulsingView key={collection.id} active={isLoading}>
            <ImageListRow
              accessibilityLabel={`Open shared collection ${collection.title}`}
              imageUri={collection.imageUri}
              isLoading={isLoading}
              testID={`shared-collection-row-${collection.id}`}
              title={collection.title}
              onPress={() => router.push({ pathname: '/collections/[id]', params: { id: collection.id } })}
            />
          </PulsingView>
        ))}
      </ScrollView>

      <Portal>
        <Dialog visible={isCreateDialogVisible} onDismiss={() => setIsCreateDialogVisible(false)}>
          <Dialog.Title>Create Collection</Dialog.Title>
          <Dialog.Content>
            <TextInput
              autoFocus
              mode="outlined"
              label="Collection name"
              value={newCollectionTitle}
              onChangeText={setNewCollectionTitle}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsCreateDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleCreateCollection}>Create</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

function LoadingCollectionRows() {
  return (
    <View style={styles.skeletonContent}>
      {Array.from({ length: 4 }).map((_, index) => (
        <PulsingView key={index} active>
          <View style={styles.skeletonRow}>
            <View style={styles.skeletonLine} />
          </View>
        </PulsingView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    gap: 1,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  createRow: {
    height: 124,
    justifyContent: 'flex-end',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: AppColors.surface,
    boxShadow: `0 1px 3px ${AppColors.shadow}`,
  },
  createTitle: {
    color: AppColors.text,
    fontWeight: '800',
  },
  emptyCard: {
    marginHorizontal: 12,
    borderRadius: 8,
  },
  sharedHeading: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 10,
    color: AppColors.textMuted,
    fontWeight: '800',
  },
  skeletonContent: {
    gap: 1,
  },
  skeletonRow: {
    height: 130,
    borderRadius: 0,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: AppColors.surfaceMuted,
  },
  skeletonLine: {
    width: '48%',
    height: 20,
    borderRadius: 6,
    backgroundColor: AppColors.surface,
  },
});
