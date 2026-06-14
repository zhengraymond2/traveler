import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

import { useDatabase } from '@/db/database-provider';
import type { Location } from '@/db/schema';

export default function SavedCountryScreen() {
  const theme = useTheme();
  const { reader } = useDatabase();
  const params = useLocalSearchParams<{ country?: string }>();
  const country = normalizeParam(params.country);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      async function loadLocations() {
        setIsLoading(true);
        setErrorMessage(null);

        try {
          const savedLocations = country ? await reader.listLocationsByCountry(country) : [];
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

      loadLocations();

      return () => {
        isActive = false;
      };
    }, [country, reader])
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: country || 'Saved Locations',
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

        {locations.map((location) => (
          <Card key={location.id} mode="elevated" style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text selectable variant="titleMedium">
                {location.name || 'Untitled location'}
              </Text>
              {location.notes ? (
                <Text selectable variant="bodyMedium">
                  {location.notes}
                </Text>
              ) : null}
              <Text selectable variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatLocationCaption(location)}
              </Text>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </>
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
    gap: 16,
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    flex: 1,
  },
  card: {
    borderRadius: 8,
  },
  cardContent: {
    gap: 8,
  },
});
