import { router, Stack, useFocusEffect } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput, useTheme } from 'react-native-paper';

import { LoadingTripRows, TripGallery } from '@/components/trips/trip-gallery';
import { AppColors } from '@/constants/theme';
import { useDatabase } from '@/db/database-provider';
import type { TripKind } from '@/db/schema';
import type { TripWithDays } from '@/db/trips-repository';
import { getTripRows } from '@/features/trips/trip-rows';

export default function TripsScreen() {
  const theme = useTheme();
  const { tripsReader, tripsWriter } = useDatabase();
  const [trips, setTrips] = React.useState<TripWithDays[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isCreateDialogVisible, setIsCreateDialogVisible] = React.useState(false);
  const [createTripKind, setCreateTripKind] = React.useState<TripKind>('local');
  const [newTripTitle, setNewTripTitle] = React.useState('');

  const tripRows = React.useMemo(() => getTripRows(trips), [trips]);
  const localRows = tripRows.filter((trip) => trip.kind === 'local');
  const sharedRows = tripRows.filter((trip) => trip.kind === 'shared');

  const loadTrips = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      setTrips(await tripsReader.listTripsWithDays());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load trips.');
    } finally {
      setIsLoading(false);
    }
  }, [tripsReader]);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      async function loadActiveTrips() {
        setIsLoading(true);
        setErrorMessage(null);

        try {
          const savedTrips = await tripsReader.listTripsWithDays();
          if (isActive) {
            setTrips(savedTrips);
          }
        } catch (error) {
          if (isActive) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to load trips.');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      loadActiveTrips();

      return () => {
        isActive = false;
      };
    }, [tripsReader])
  );

  function openCreateDialog(kind: TripKind) {
    setCreateTripKind(kind);
    setNewTripTitle('');
    setIsCreateDialogVisible(true);
  }

  function closeCreateDialog() {
    setIsCreateDialogVisible(false);
    setNewTripTitle('');
  }

  async function handleCreateTrip() {
    try {
      const trip = await tripsWriter.createTrip({ title: newTripTitle, kind: createTripKind });
      closeCreateDialog();
      router.push({ pathname: '/trips/[id]', params: { id: trip.id } });
      await loadTrips();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create trip.');
    }
  }

  function handleOpenTrip(id: string) {
    router.push({ pathname: '/trips/[id]', params: { id } });
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Trips' }} />
      <ScrollView
        testID="trips-screen"
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        {errorMessage ? (
          <Text selectable variant="bodyMedium" style={{ color: theme.colors.error }}>
            {errorMessage}
          </Text>
        ) : null}

        <TripSectionHeader
          buttonLabel="Create trip"
          testID="trips-section-header-local"
          title="Trips"
          onCreate={() => openCreateDialog('local')}
        />

        {!isLoading && localRows.length === 0 ? (
          <Text selectable variant="bodyMedium" style={styles.emptyText}>
            No trips yet.
          </Text>
        ) : null}

        {isLoading && tripRows.length === 0 ? <LoadingTripRows /> : null}

        <TripGallery trips={localRows} isLoading={isLoading} onOpenTrip={handleOpenTrip} />

        <TripSectionHeader
          buttonLabel="Create shared trip"
          testID="trips-section-header-shared"
          title="Shared Trips"
          variant="muted"
          onCreate={() => openCreateDialog('shared')}
        />

        <TripGallery trips={sharedRows} isLoading={isLoading} shared onOpenTrip={handleOpenTrip} />
      </ScrollView>

      <Portal>
        <Dialog visible={isCreateDialogVisible} onDismiss={closeCreateDialog}>
          <Dialog.Title>{createTripKind === 'shared' ? 'Create Shared Trip' : 'Create Trip'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              autoFocus
              testID="trip-title-input"
              mode="outlined"
              label="Trip name"
              value={newTripTitle}
              onChangeText={setNewTripTitle}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeCreateDialog}>Cancel</Button>
            <Button disabled={!newTripTitle.trim()} onPress={handleCreateTrip}>
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

function TripSectionHeader({
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
    fontWeight: '200',
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
    fontWeight: '200',
    lineHeight: 26,
  },
  emptyText: {
    paddingHorizontal: 16,
    color: AppColors.textMuted,
    fontWeight: '200',
  },
  sharedHeading: {
    color: AppColors.textMuted,
  },
});
