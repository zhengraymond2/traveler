import { useDragSelect } from '@osamaq/drag-select';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import type { TapGesture } from 'react-native-gesture-handler';
import { Button, Card, Dialog, Portal, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import Animated, { useAnimatedRef, useAnimatedScrollHandler } from 'react-native-reanimated';

import { PulsingView } from '@/components/pulsing-view';
import { useDatabase } from '@/db/database-provider';
import type { LocationWithPhotos } from '@/db/repository';

const unknownCountryLabel = 'Unknown';
const rowHeight = 130;
const rowGap = 1;
const horizontalContentPadding = 0;
const topContentPadding = 16;

export default function SavedCountryScreen() {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { reader, writer } = useDatabase();
  const params = useLocalSearchParams<{ country?: string }>();
  const country = normalizeParam(params.country);
  const [locations, setLocations] = React.useState<LocationWithPhotos[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const [isMoveDialogVisible, setIsMoveDialogVisible] = React.useState(false);
  const [targetAlbum, setTargetAlbum] = React.useState('');
  const selectedCount = selectedIds.size;
  const flatListRef = useAnimatedRef<FlatList<LocationWithPhotos>>();
  const rowWidth = Math.max(1, windowWidth - horizontalContentPadding * 2);

  const { gestures, onScroll, selection } = useDragSelect({
    data: locations,
    key: 'id',
    list: {
      animatedRef: flatListRef,
      numColumns: 1,
      rowGap,
      itemSize: { height: rowHeight, width: rowWidth },
      contentInset: {
        top: topContentPadding,
        left: horizontalContentPadding,
        right: horizontalContentPadding,
      },
    },
    longPressGesture: {
      enabled: true,
      minDurationMs: 260,
    },
    onItemPress: (id) => {
      router.push({ pathname: '/saved/location/[id]', params: { id } });
    },
    onItemSelected: (id) => {
      setSelectedIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.add(id);
        return nextIds;
      });
    },
    onItemDeselected: (id) => {
      setSelectedIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(id);
        return nextIds;
      });
    },
  });
  const scrollHandler = useAnimatedScrollHandler({ onScroll });

  const loadLocations = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const savedLocations =
        country === unknownCountryLabel
          ? await reader.listLocationsWithoutCountryWithPhotos()
          : country
            ? await reader.listLocationsWithPhotosByCountry(country)
            : [];
      setLocations(savedLocations);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load country locations.');
    } finally {
      setIsLoading(false);
    }
  }, [country, reader]);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      async function loadActiveLocations() {
        setIsLoading(true);
        setErrorMessage(null);

        try {
          const savedLocations =
            country === unknownCountryLabel
              ? await reader.listLocationsWithoutCountryWithPhotos()
              : country
                ? await reader.listLocationsWithPhotosByCountry(country)
                : [];
          if (isActive) {
            setLocations(savedLocations);
          }
        } catch (error) {
          if (isActive) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to load country locations.');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      loadActiveLocations();

      return () => {
        isActive = false;
      };
    }, [country, reader])
  );

  async function handleDeleteSelected() {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => writer.deleteLocation(id)));
    selection.clear();
    setSelectedIds(new Set());
    await loadLocations();
  }

  async function handleMoveSelected() {
    const album = targetAlbum.trim();
    if (!album) {
      setErrorMessage('Enter a country or region to move the selected records.');
      return;
    }

    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => writer.updateLocation(id, { country: album })));
    selection.clear();
    setSelectedIds(new Set());
    setTargetAlbum('');
    setIsMoveDialogVisible(false);
    await loadLocations();
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: country || 'Saved Locations',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        {errorMessage ? (
          <Text selectable variant="bodyMedium" style={[styles.statusText, { color: theme.colors.error }]}>
            {errorMessage}
          </Text>
        ) : null}

        {!isLoading && locations.length === 0 ? (
          <Card mode="outlined" style={styles.emptyCard}>
            <Card.Content>
              <Text selectable variant="bodyMedium">
                No saved locations for this country yet.
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        {isLoading && locations.length === 0 ? (
          <View style={styles.content}>
            <LoadingLocationRows />
          </View>
        ) : (
          <GestureDetector gesture={gestures.panHandler}>
            <Animated.FlatList
              ref={flatListRef}
              data={locations}
              keyExtractor={(item) => item.id}
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={[styles.content, selectedCount > 0 && styles.contentWithActionBar]}
              ItemSeparatorComponent={RowSeparator}
              renderItem={({ item, index }) => (
                <LocationRow
                  location={item}
                  isLoading={isLoading}
                  isSelectionActive={selectedCount > 0}
                  isSelected={selectedIds.has(item.id)}
                  itemGesture={gestures.createItemPressHandler(item.id, index)}
                />
              )}
            />
          </GestureDetector>
        )}
      </View>

      <Portal>
        {selectedCount > 0 ? (
          <Surface mode="elevated" style={styles.floatingActionBar}>
            <Text selectable={false} variant="labelLarge">
              {selectedCount} selected
            </Text>
            <View style={styles.actionButtons}>
              <Button mode="outlined" compact onPress={() => setIsMoveDialogVisible(true)}>
                Move
              </Button>
              <Button mode="contained" compact buttonColor={theme.colors.error} onPress={handleDeleteSelected}>
                Delete
              </Button>
            </View>
          </Surface>
        ) : null}

        <Dialog visible={isMoveDialogVisible} onDismiss={() => setIsMoveDialogVisible(false)}>
          <Dialog.Title>Move to album</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Country or region"
              value={targetAlbum}
              onChangeText={setTargetAlbum}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsMoveDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleMoveSelected}>Move</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

type LocationRowProps = {
  isLoading: boolean;
  isSelectionActive: boolean;
  isSelected: boolean;
  itemGesture: TapGesture;
  location: LocationWithPhotos;
};

function LocationRow({ isLoading, isSelectionActive, isSelected, itemGesture, location }: LocationRowProps) {
  const imageUri = getStableRandomPhotoUri(location);

  return (
    <GestureDetector gesture={itemGesture}>
      <PulsingView active={isLoading}>
        <Pressable
          disabled={isLoading}
          style={({ pressed }) => [
            styles.locationRow,
            isLoading && styles.locationRowLoading,
            pressed && styles.locationRowPressed,
            isSelectionActive && styles.locationRowDimmed,
            isSelectionActive && isSelected && styles.locationRowSelected,
          ]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.rowImage} contentFit="cover" />
          ) : (
            <View style={styles.rowFallbackOverlay} />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.38)', 'rgba(0,0,0,0.78)']}
            locations={[0, 0.42, 1]}
            style={styles.locationGradient}>
            <View style={styles.locationText}>
              <Text selectable variant="titleMedium" numberOfLines={1} style={styles.locationTitle}>
                {location.name || 'Untitled location'}
              </Text>
              <Text selectable variant="bodyMedium" numberOfLines={2} style={styles.locationNotes}>
                {location.notes || 'No notes saved.'}
              </Text>
              <Text selectable variant="labelMedium" numberOfLines={1} style={styles.locationCaption}>
                {formatLocationCaption(location)}
              </Text>
            </View>
            {isSelectionActive ? <SelectionControl selected={isSelected} /> : null}
          </LinearGradient>
        </Pressable>
      </PulsingView>
    </GestureDetector>
  );
}

function LoadingLocationRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <React.Fragment key={index}>
          <PulsingView active>
            <View style={[styles.locationRow, styles.locationRowLoading, styles.loadingRow]}>
              <View style={styles.locationText}>
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonLineWide} />
                <View style={styles.skeletonLineNarrow} />
              </View>
            </View>
          </PulsingView>
          {index < 3 ? <RowSeparator /> : null}
        </React.Fragment>
      ))}
    </>
  );
}

function RowSeparator() {
  return <View style={styles.cardSpacer} />;
}

function SelectionControl({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.selectionControl, selected && styles.selectionControlSelected]}>
      {selected ? (
        <Text selectable={false} variant="labelMedium" style={styles.selectionCheckmark}>
          ✓
        </Text>
      ) : null}
    </View>
  );
}

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatLocationCaption(location: LocationWithPhotos) {
  const parts = [
    location.category,
    location.googleMapsUrl ? 'Google Maps' : undefined,
    location.instagramUrl ? 'Instagram' : undefined,
  ].filter(Boolean);

  return parts.length ? parts.join(' · ') : 'Saved source';
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
  content: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  contentWithActionBar: {
    paddingBottom: 112,
  },
  floatingActionBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyCard: {
    margin: 16,
    borderRadius: 8,
  },
  locationRow: {
    width: '100%',
    height: 130,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  locationRowPressed: {
    backgroundColor: '#f6f6f6',
  },
  locationRowLoading: {
    backgroundColor: '#f3f4f6',
  },
  loadingRow: {
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  locationRowDimmed: {
    opacity: 0.42,
  },
  locationRowSelected: {
    opacity: 1,
  },
  cardSpacer: {
    height: rowGap,
    backgroundColor: '#ffffff',
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
    backgroundColor: '#e7ebe9',
  },
  locationGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    padding: 16,
  },
  locationText: {
    flex: 1,
    gap: 8,
  },
  locationTitle: {
    color: '#ffffff',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  locationNotes: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  locationCaption: {
    color: 'rgba(255, 255, 255, 0.78)',
  },
  skeletonTitle: {
    width: '52%',
    height: 18,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  skeletonLineWide: {
    width: '86%',
    height: 14,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  skeletonLineNarrow: {
    width: '42%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  selectionControl: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#74796f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionControlSelected: {
    borderColor: '#256f6c',
    backgroundColor: '#256f6c',
  },
  selectionCheckmark: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
