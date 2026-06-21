import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Dialog, Menu, Portal, Text, TextInput, useTheme } from 'react-native-paper';

import { AppColors } from '@/constants/theme';
import { useDatabase } from '@/db/database-provider';
import type { LocationWithPhotos, SavedCollectionWithLocations } from '@/db/repository';

export default function CollectionDetailScreen() {
  const theme = useTheme();
  const { reader, writer } = useDatabase();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = normalizeParam(params.id);
  const [collection, setCollection] = React.useState<SavedCollectionWithLocations | null>(null);
  const [allLocations, setAllLocations] = React.useState<LocationWithPhotos[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isMenuVisible, setIsMenuVisible] = React.useState(false);
  const [dialog, setDialog] = React.useState<CollectionDialog>(null);
  const [draftTitle, setDraftTitle] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');

  const collectionLocationIds = React.useMemo(
    () => new Set(collection?.locations.map((location) => location.id) ?? []),
    [collection]
  );
  const searchableLocations = React.useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return allLocations
      .filter((location) => !collectionLocationIds.has(location.id))
      .filter((location) => {
        if (!query) {
          return true;
        }

        return [location.name, location.country, location.category]
          .filter(Boolean)
          .some((value) => value?.toLocaleLowerCase().includes(query));
      })
      .sort((left, right) => getLocationTitle(left).localeCompare(getLocationTitle(right)));
  }, [allLocations, collectionLocationIds, searchQuery]);

  const loadCollection = React.useCallback(async () => {
    if (!id) {
      setCollection(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [savedCollection, savedLocations] = await Promise.all([
        reader.getCollection(id),
        reader.listLocationsWithPhotos(),
      ]);
      setCollection(savedCollection);
      setAllLocations(savedLocations);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load collection.');
    } finally {
      setIsLoading(false);
    }
  }, [id, reader]);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      async function loadActiveCollection() {
        if (!id) {
          if (isActive) {
            setCollection(null);
            setIsLoading(false);
          }
          return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        try {
          const [savedCollection, savedLocations] = await Promise.all([
            reader.getCollection(id),
            reader.listLocationsWithPhotos(),
          ]);
          if (isActive) {
            setCollection(savedCollection);
            setAllLocations(savedLocations);
          }
        } catch (error) {
          if (isActive) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to load collection.');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      loadActiveCollection();

      return () => {
        isActive = false;
      };
    }, [id, reader])
  );

  async function handleRenameCollection() {
    if (!collection) {
      return;
    }

    try {
      await writer.renameCollection(collection.id, draftTitle);
      setDialog(null);
      await loadCollection();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to rename collection.');
    }
  }

  async function handleDuplicateCollection(kind = collection?.kind ?? 'local') {
    if (!collection) {
      return;
    }

    try {
      const duplicatedCollection = await writer.duplicateCollection({
        id: collection.id,
        title: draftTitle,
        kind,
      });
      setDialog(null);
      router.push({ pathname: '/collections/[id]', params: { id: duplicatedCollection.id } });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to duplicate collection.');
    }
  }

  async function handleConvertToShared() {
    if (!collection) {
      return;
    }

    try {
      const sharedCollection = await writer.convertCollectionToShared(collection.id, draftTitle || collection.title);
      setDialog(null);
      router.push({ pathname: '/collections/[id]', params: { id: sharedCollection.id } });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to convert collection.');
    }
  }

  async function handleDeleteCollection() {
    if (!collection) {
      return;
    }

    try {
      await writer.deleteCollection(collection.id);
      setDialog(null);
      router.replace('/collections');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete collection.');
    }
  }

  async function handleAddLocation(locationId: string) {
    if (!collection) {
      return;
    }

    try {
      await writer.addLocationToCollection(collection.id, locationId);
      await loadCollection();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to add location.');
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: collection?.title || 'Collection',
          headerBackButtonDisplayMode: 'minimal',
          headerRight: () =>
            collection ? (
              <Menu
                visible={isMenuVisible}
                onDismiss={() => setIsMenuVisible(false)}
                anchor={
                  <Button compact mode="text" onPress={() => setIsMenuVisible(true)}>
                    ☰
                  </Button>
                }>
                <Menu.Item
                  title="Add by Search"
                  leadingIcon="magnify"
                  onPress={() => {
                    setIsMenuVisible(false);
                    setSearchQuery('');
                    setDialog('search');
                  }}
                />
                <Menu.Item
                  title="Rename Collection"
                  leadingIcon="pencil"
                  onPress={() => {
                    setIsMenuVisible(false);
                    setDraftTitle(collection.title);
                    setDialog('rename');
                  }}
                />
                <Menu.Item
                  title="Duplicate Collection"
                  leadingIcon="content-copy"
                  onPress={() => {
                    setIsMenuVisible(false);
                    setDraftTitle(`${collection.title} Copy`);
                    setDialog('duplicate');
                  }}
                />
                {collection.kind === 'local' ? (
                  <Menu.Item
                    title="Convert to Shared Collection"
                    leadingIcon="account-group"
                    onPress={() => {
                      setIsMenuVisible(false);
                      setDraftTitle(collection.title);
                      setDialog('convert');
                    }}
                  />
                ) : null}
                <Menu.Item
                  title="Delete Collection"
                  leadingIcon="delete"
                  titleStyle={{ color: theme.colors.error }}
                  onPress={() => {
                    setIsMenuVisible(false);
                    setDialog('delete');
                  }}
                />
              </Menu>
            ) : null,
        }}
      />

      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        {errorMessage ? (
          <Text selectable variant="bodyMedium" style={[styles.statusText, { color: theme.colors.error }]}>
            {errorMessage}
          </Text>
        ) : null}

        {isLoading ? (
          <Text selectable variant="bodyMedium" style={[styles.statusText, { color: theme.colors.onSurfaceVariant }]}>
            Loading collection...
          </Text>
        ) : null}

        {!isLoading && !collection ? (
          <Card mode="outlined" style={styles.emptyCard}>
            <Card.Content>
              <Text selectable variant="bodyMedium">
                This collection could not be found.
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        {collection && collection.locations.length === 0 ? (
          <Card mode="outlined" style={styles.emptyCard}>
            <Card.Content>
              <Text selectable variant="bodyMedium">
                No saved locations in this collection yet.
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        {collection ? (
          <FlatList
            data={collection.locations}
            keyExtractor={(item) => item.id}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.content}
            ItemSeparatorComponent={RowSeparator}
            renderItem={({ item }) => (
              <LocationRow
                location={item}
                onPress={() => router.push({ pathname: '/saved/location/[id]', params: { id: item.id } })}
              />
            )}
          />
        ) : null}
      </View>

      <Portal>
        <NameDialog
          actionLabel="Rename"
          title="Rename Collection"
          visible={dialog === 'rename'}
          value={draftTitle}
          onChange={setDraftTitle}
          onDismiss={() => setDialog(null)}
          onSubmit={handleRenameCollection}
        />
        <NameDialog
          actionLabel="Duplicate"
          title="Duplicate Collection"
          visible={dialog === 'duplicate'}
          value={draftTitle}
          onChange={setDraftTitle}
          onDismiss={() => setDialog(null)}
          onSubmit={() => handleDuplicateCollection()}
        />
        <NameDialog
          actionLabel="Convert"
          title="Convert to Shared Collection"
          visible={dialog === 'convert'}
          value={draftTitle}
          onChange={setDraftTitle}
          onDismiss={() => setDialog(null)}
          onSubmit={handleConvertToShared}
        />

        <Dialog visible={dialog === 'search'} onDismiss={() => setDialog(null)}>
          <Dialog.Title>Add by Search</Dialog.Title>
          <Dialog.Content>
            <View style={styles.searchDialogContent}>
              <TextInput
                autoFocus
                mode="outlined"
                label="Search saved locations"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <ScrollView style={styles.searchResults}>
                {searchableLocations.map((location) => (
                  <Pressable
                    key={location.id}
                    accessibilityRole="button"
                    style={styles.searchResultRow}
                    onPress={() => handleAddLocation(location.id)}>
                    <Text selectable={false} variant="titleMedium" numberOfLines={1} style={styles.searchResultTitle}>
                      {getLocationTitle(location)}
                    </Text>
                    <Text selectable={false} variant="bodySmall" numberOfLines={1} style={styles.searchResultCaption}>
                      {[location.country, location.category].filter(Boolean).join(' · ') || 'Saved location'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialog(null)}>Done</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={dialog === 'delete'} onDismiss={() => setDialog(null)}>
          <Dialog.Title>Delete Collection</Dialog.Title>
          <Dialog.Content>
            <Text selectable variant="bodyMedium">
              Delete this collection? Saved locations inside it will stay in your library.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialog(null)}>Cancel</Button>
            <Button textColor={theme.colors.error} onPress={handleDeleteCollection}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

type CollectionDialog = null | 'rename' | 'duplicate' | 'convert' | 'delete' | 'search';

function NameDialog({
  actionLabel,
  title,
  visible,
  value,
  onChange,
  onDismiss,
  onSubmit,
}: {
  actionLabel: string;
  title: string;
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  onDismiss: () => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Content>
        <TextInput autoFocus mode="outlined" label="Collection name" value={value} onChangeText={onChange} />
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button onPress={onSubmit}>{actionLabel}</Button>
      </Dialog.Actions>
    </Dialog>
  );
}

function LocationRow({ location, onPress }: { location: LocationWithPhotos; onPress: () => void }) {
  const imageUri = getStableRandomPhotoUri(location);

  return (
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.locationRow, pressed && styles.locationRowPressed]} onPress={onPress}>
      {imageUri ? <Image source={{ uri: imageUri }} style={styles.rowImage} contentFit="cover" /> : <View style={styles.rowFallbackOverlay} />}
      <LinearGradient
        colors={[AppColors.overlayTransparent, AppColors.overlayMedium, AppColors.overlayStronger]}
        locations={[0, 0.42, 1]}
        style={styles.locationGradient}>
        <View style={styles.locationText}>
          <Text selectable variant="titleMedium" numberOfLines={1} style={styles.locationTitle}>
            {getLocationTitle(location)}
          </Text>
          <Text selectable variant="bodyMedium" numberOfLines={2} style={styles.locationNotes}>
            {location.notes || 'No notes saved.'}
          </Text>
          <Text selectable variant="labelMedium" numberOfLines={1} style={styles.locationCaption}>
            {[location.country, location.category].filter(Boolean).join(' · ') || 'Saved source'}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function RowSeparator() {
  return <View style={styles.cardSpacer} />;
}

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getLocationTitle(location: LocationWithPhotos) {
  return location.name || 'Untitled location';
}

function getStableRandomPhotoUri(location: LocationWithPhotos) {
  if (!location.photos.length) {
    return undefined;
  }

  return location.photos[hashString(location.id) % location.photos.length]?.uri;
}

function hashString(value: string) {
  return Array.from(value).reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  statusText: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyCard: {
    margin: 16,
    borderRadius: 8,
  },
  content: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  locationRow: {
    width: '100%',
    height: 130,
    overflow: 'hidden',
    backgroundColor: AppColors.surface,
  },
  locationRowPressed: {
    backgroundColor: AppColors.surfacePressed,
  },
  cardSpacer: {
    height: 1,
    backgroundColor: AppColors.divider,
  },
  rowImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  rowFallbackOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: AppColors.imageFallback,
  },
  locationGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  locationText: {
    gap: 8,
  },
  locationTitle: {
    color: AppColors.textInverse,
    fontWeight: '700',
    textShadowColor: AppColors.textShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  locationNotes: {
    color: AppColors.imageTextSecondary,
  },
  locationCaption: {
    color: AppColors.imageTextMuted,
  },
  searchDialogContent: {
    gap: 12,
  },
  searchResults: {
    maxHeight: 320,
  },
  searchResultRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.divider,
  },
  searchResultTitle: {
    color: AppColors.text,
    fontWeight: '700',
  },
  searchResultCaption: {
    color: AppColors.textMuted,
  },
});
