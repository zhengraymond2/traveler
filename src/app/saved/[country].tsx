import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Dialog, Portal, Surface, Text, TextInput, useTheme } from 'react-native-paper';

import { useDatabase } from '@/db/database-provider';
import type { Location } from '@/db/schema';

const unknownCountryLabel = 'Unknown';

export default function SavedCountryScreen() {
  const theme = useTheme();
  const { reader, writer } = useDatabase();
  const params = useLocalSearchParams<{ country?: string }>();
  const country = normalizeParam(params.country);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const [isMoveDialogVisible, setIsMoveDialogVisible] = React.useState(false);
  const [targetAlbum, setTargetAlbum] = React.useState('');
  const selectedCount = selectedIds.size;

  const loadLocations = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const savedLocations =
        country === unknownCountryLabel
          ? await reader.listLocationsWithoutCountry()
          : country
            ? await reader.listLocationsByCountry(country)
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
        try {
          const savedLocations =
            country === unknownCountryLabel
              ? await reader.listLocationsWithoutCountry()
              : country
                ? await reader.listLocationsByCountry(country)
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

  function toggleEditing() {
    setIsEditing((currentValue) => {
      if (currentValue) {
        setSelectedIds(new Set());
      }
      return !currentValue;
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(id)) {
        nextIds.delete(id);
      } else {
        nextIds.add(id);
      }
      return nextIds;
    });
  }

  async function handleDeleteSelected() {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => writer.deleteLocation(id)));
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
          headerRight: () => (
            <Button compact mode="text" onPress={toggleEditing}>
              {isEditing ? 'Done' : 'Edit'}
            </Button>
          ),
        }}
      />
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, isEditing && selectedCount > 0 && styles.contentWithActionBar]}>
        {errorMessage ? (
          <Text selectable variant="bodyMedium" style={{ color: theme.colors.error }}>
            {errorMessage}
          </Text>
        ) : null}

        {isLoading ? (
          <Text selectable variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Loading saved locations...
          </Text>
        ) : null}

        {!isLoading && locations.length === 0 ? (
          <Card mode="outlined" style={styles.card}>
            <Card.Content>
              <Text selectable variant="bodyMedium">
                No saved locations for this country yet.
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        {locations.map((location, index) => (
          <React.Fragment key={location.id}>
            <Pressable
              style={({ pressed }) => [
                styles.locationRow,
                pressed && styles.locationRowPressed,
                isEditing && styles.locationRowDimmed,
                isEditing && selectedIds.has(location.id) && styles.locationRowSelected,
              ]}
              onPress={() => {
                if (isEditing) {
                  toggleSelected(location.id);
                } else {
                  router.push({ pathname: '/saved/location/[id]', params: { id: location.id } });
                }
              }}>
              <View style={styles.locationRowContent}>
                <View style={styles.locationText}>
                  <Text selectable variant="titleMedium" numberOfLines={1} style={styles.locationTitle}>
                    {location.name || 'Untitled location'}
                  </Text>
                  <Text selectable variant="bodyMedium" numberOfLines={2} style={styles.locationNotes}>
                    {location.notes || 'No notes saved.'}
                  </Text>
                  <Text
                    selectable
                    variant="labelMedium"
                    numberOfLines={1}
                    style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatLocationCaption(location)}
                  </Text>
                </View>
                {isEditing ? <SelectionControl selected={selectedIds.has(location.id)} /> : null}
              </View>
            </Pressable>
            {index < locations.length - 1 ? <View style={styles.cardSpacer} /> : null}
          </React.Fragment>
        ))}
      </ScrollView>

      <Portal>
        {isEditing && selectedCount > 0 ? (
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

function formatLocationCaption(location: Location) {
  const parts = [
    location.category,
    location.googleMapsUrl ? 'Google Maps' : undefined,
    location.instagramUrl ? 'Instagram' : undefined,
  ].filter(Boolean);

  return parts.length ? parts.join(' · ') : 'Saved source';
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
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
  card: {
    borderRadius: 8,
  },
  locationRow: {
    width: '100%',
    height: 130,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  locationRowPressed: {
    backgroundColor: '#f6f6f6',
  },
  locationRowDimmed: {
    opacity: 0.42,
  },
  locationRowSelected: {
    opacity: 1,
  },
  cardSpacer: {
    height: 1,
    backgroundColor: '#ffffff',
  },
  locationRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  locationText: {
    flex: 1,
    gap: 8,
  },
  locationTitle: {
    color: '#111827',
    fontWeight: '700',
  },
  locationNotes: {
    color: '#374151',
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
