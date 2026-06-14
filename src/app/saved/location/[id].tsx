import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

import { useDatabase } from '@/db/database-provider';
import type { LocationWithPhotos } from '@/db/repository';

export default function SavedLocationDetailScreen() {
  const theme = useTheme();
  const { reader } = useDatabase();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = normalizeParam(params.id);
  const [location, setLocation] = React.useState<LocationWithPhotos | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      async function loadLocation() {
        setIsLoading(true);
        setErrorMessage(null);

        try {
          const savedLocation = id ? await reader.getLocation(id) : null;
          if (isActive) {
            setLocation(savedLocation);
          }
        } catch (error) {
          if (isActive) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to load saved location.');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      loadLocation();

      return () => {
        isActive = false;
      };
    }, [id, reader])
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: location?.name || 'Saved Location',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />

      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        {errorMessage ? (
          <Text selectable variant="bodyMedium" style={{ color: theme.colors.error }}>
            {errorMessage}
          </Text>
        ) : null}

        {isLoading ? (
          <Text selectable variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Loading saved location...
          </Text>
        ) : null}

        {!isLoading && !location ? (
          <Card mode="outlined" style={styles.card}>
            <Card.Content>
              <Text selectable variant="bodyMedium">
                This saved location could not be found.
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        {location ? (
          <>
            <Card mode="elevated" style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <Text selectable variant="headlineSmall">
                  {location.name || 'Untitled location'}
                </Text>
                <Field label="Country or region" value={location.country} />
                <Field label="Category" value={location.category} />
                <Field label="GPS coordinates" value={formatCoordinates(location)} />
                <Field label="Google Maps" value={location.googleMapsUrl} />
                <Field label="Instagram" value={location.instagramUrl} />
                <Field label="Notes" value={location.notes} />
              </Card.Content>
            </Card>

            <Card mode="outlined" style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <Text selectable variant="titleMedium">
                  Photos
                </Text>
                {location.photos.length ? (
                  location.photos.map((photo) => (
                    <Field key={photo.id} label={photo.caption || 'Photo'} value={photo.uri} />
                  ))
                ) : (
                  <Text selectable variant="bodyMedium">
                    No photos saved yet.
                  </Text>
                )}
              </Card.Content>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <Text selectable variant="labelLarge">
        {label}
      </Text>
      <Text selectable variant="bodyMedium">
        {value || 'Not saved'}
      </Text>
    </>
  );
}

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatCoordinates(location: LocationWithPhotos) {
  if (location.latitude == null || location.longitude == null) {
    return undefined;
  }

  return `${location.latitude}, ${location.longitude}`;
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 8,
  },
  cardContent: {
    gap: 8,
  },
});
