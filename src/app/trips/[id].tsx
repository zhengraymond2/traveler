import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Dialog, Menu, Portal, Text, TextInput, useTheme } from 'react-native-paper';

import { DetailEventForm, type DetailEventFormSaveInput } from '@/components/trips/detail-event-form';
import type { SavedTripLocation } from '@/components/trips/saved-location-picker';
import { TripStartDateCalendar } from '@/components/trips/trip-start-date-calendar';
import { TripTimeline, type CreateDetailEventDraft } from '@/components/trips/trip-timeline';
import { AppColors } from '@/constants/theme';
import { useDatabase } from '@/db/database-provider';
import type { LocationWithPhotos } from '@/db/repository';
import type { TripWithDays } from '@/db/trips-repository';

type PlannerDialog = null | 'delete' | 'rename' | 'start-date';

export default function TripPlannerScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = normalizeParam(params.id);
  const { reader, tripsReader, tripsWriter } = useDatabase();
  const [trip, setTrip] = React.useState<TripWithDays | null>(null);
  const [savedLocations, setSavedLocations] = React.useState<SavedTripLocation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isMenuVisible, setIsMenuVisible] = React.useState(false);
  const [dialog, setDialog] = React.useState<PlannerDialog>(null);
  const [draftTitle, setDraftTitle] = React.useState('');
  const [draftStartDate, setDraftStartDate] = React.useState('');
  const [detailDraft, setDetailDraft] = React.useState<CreateDetailEventDraft | null>(null);
  const detailDraftTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTrip = React.useCallback(async () => {
    if (!id) {
      setTrip(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [savedTrip, locations] = await Promise.all([tripsReader.getTrip(id), reader.listLocationsWithPhotos()]);
      setTrip(savedTrip);
      setSavedLocations(locations.map(toSavedTripLocation));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load trip.');
    } finally {
      setIsLoading(false);
    }
  }, [id, reader, tripsReader]);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      async function loadActiveTrip() {
        if (!isActive) {
          return;
        }
        await loadTrip();
      }

      loadActiveTrip();

      return () => {
        isActive = false;
        if (detailDraftTimerRef.current) {
          clearTimeout(detailDraftTimerRef.current);
        }
      };
    }, [loadTrip])
  );

  async function handleInsertDayEvent(index: number) {
    if (!trip) {
      return;
    }

    try {
      await tripsWriter.insertDayEvent({ tripId: trip.id, index });
      await loadTrip();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to add day.');
    }
  }

  function handleCreateDetailDraft(draft: CreateDetailEventDraft) {
    if (detailDraftTimerRef.current) {
      clearTimeout(detailDraftTimerRef.current);
    }

    detailDraftTimerRef.current = setTimeout(() => {
      setDetailDraft(draft);
    }, 200);
  }

  async function handleSaveDetailEvent(input: DetailEventFormSaveInput) {
    try {
      const detailEvent = await tripsWriter.createDetailEvent({
        addressText: input.addressText,
        category: input.category,
        dayEventId: input.dayEventId,
        description: input.description,
        endMinute: input.endMinute,
        googleMapsUrl: input.googleMapsUrl,
        locationId: input.locationId,
        startMinute: input.startMinute,
        title: input.title,
      });

      await Promise.all(
        input.photos.map((photo) =>
          tripsWriter.addDetailEventPhoto({
            detailEventId: detailEvent.id,
            uri: photo.uri,
          })
        )
      );

      setDetailDraft(null);
      await loadTrip();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save detail event.');
    }
  }

  async function handleRenameTrip() {
    if (!trip) {
      return;
    }

    try {
      await tripsWriter.renameTrip(trip.id, draftTitle);
      setDialog(null);
      await loadTrip();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to rename trip.');
    }
  }

  async function handleSetStartDate() {
    if (!trip) {
      return;
    }

    try {
      await tripsWriter.updateTripStartDate(trip.id, draftStartDate.trim() || null);
      setDialog(null);
      await loadTrip();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to set start date.');
    }
  }

  async function handleDeleteTrip() {
    if (!trip) {
      return;
    }

    try {
      await tripsWriter.deleteTrip(trip.id);
      setDialog(null);
      router.replace('/trips');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete trip.');
    }
  }

  async function handleDuplicateTrip() {
    if (!trip) {
      return;
    }

    try {
      const duplicatedTrip = await tripsWriter.duplicateTrip({
        id: trip.id,
        title: `${trip.title} Copy`,
      });
      setIsMenuVisible(false);
      router.push({ pathname: '/trips/[id]', params: { id: duplicatedTrip.id } });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to duplicate trip.');
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: 'minimal',
          title: trip?.title || 'Trip',
          headerRight: () =>
            trip ? (
              <Menu
                visible={isMenuVisible}
                onDismiss={() => setIsMenuVisible(false)}
                anchor={
                  <Button compact mode="text" onPress={() => setIsMenuVisible(true)}>
                    ...
                  </Button>
                }>
                <Menu.Item
                  title="Set Start Date"
                  leadingIcon="calendar"
                  onPress={() => {
                    setIsMenuVisible(false);
                    setDraftStartDate(toDateInputValue(trip.startDate));
                    setDialog('start-date');
                  }}
                />
                <Menu.Item
                  title="Rename Trip"
                  leadingIcon="pencil"
                  onPress={() => {
                    setIsMenuVisible(false);
                    setDraftTitle(trip.title);
                    setDialog('rename');
                  }}
                />
                <Menu.Item title="Duplicate Trip" leadingIcon="content-copy" onPress={handleDuplicateTrip} />
                <Menu.Item title="Share Trip" leadingIcon="account-group" disabled />
                <Menu.Item
                  title="Delete Trip"
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

      <ScrollView
        testID="trip-planner-screen"
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        {errorMessage ? (
          <Text selectable variant="bodyMedium" style={{ color: theme.colors.error }}>
            {errorMessage}
          </Text>
        ) : null}

        {isLoading && !trip ? (
          <View style={styles.loading}>
            <ActivityIndicator />
          </View>
        ) : null}

        {trip ? (
          <>
            <Text selectable={false} variant="headlineMedium" style={styles.title}>
              {trip.title}
            </Text>
            <TripTimeline
              dayEvents={trip.dayEvents}
              startDate={trip.startDate}
              onCreateDetailEvent={handleCreateDetailDraft}
              onInsertDayEvent={handleInsertDayEvent}
            />
          </>
        ) : null}
      </ScrollView>

      {detailDraft ? (
        <DetailEventForm
          key={`${detailDraft.dayEventId}-${detailDraft.startMinute}-${detailDraft.endMinute}`}
          draft={detailDraft}
          savedLocations={savedLocations}
          visible
          onCancel={() => setDetailDraft(null)}
          onSave={handleSaveDetailEvent}
        />
      ) : null}

      <Portal>
        <Dialog visible={dialog === 'rename'} onDismiss={() => setDialog(null)}>
          <Dialog.Title>Rename Trip</Dialog.Title>
          <Dialog.Content>
            <TextInput mode="outlined" label="Trip name" value={draftTitle} onChangeText={setDraftTitle} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialog(null)}>Cancel</Button>
            <Button disabled={!draftTitle.trim()} onPress={handleRenameTrip}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={dialog === 'start-date'} onDismiss={() => setDialog(null)}>
          <Dialog.Title>Set Start Date</Dialog.Title>
          <Dialog.Content>
            <TripStartDateCalendar selectedDate={draftStartDate} onSelectDate={setDraftStartDate} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialog(null)}>Cancel</Button>
            <Button onPress={handleSetStartDate}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={dialog === 'delete'} onDismiss={() => setDialog(null)}>
          <Dialog.Title>Delete Trip</Dialog.Title>
          <Dialog.Content>
            <Text selectable variant="bodyMedium">
              Delete this trip from local storage?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialog(null)}>Cancel</Button>
            <Button onPress={handleDeleteTrip}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toSavedTripLocation(location: LocationWithPhotos): SavedTripLocation {
  return {
    googleMapsUrl: location.googleMapsUrl,
    id: location.id,
    name: location.name,
  };
}

function toDateInputValue(value: Date | string | null) {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingVertical: 16,
  },
  loading: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: AppColors.text,
    fontWeight: '200',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
