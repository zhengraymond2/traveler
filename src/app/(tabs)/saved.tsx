import { router, useFocusEffect } from 'expo-router';
import * as React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card, Chip, Text, useTheme } from 'react-native-paper';

import { useDatabase } from '@/db/database-provider';
import type { Location } from '@/db/schema';

export default function SavedLocationsScreen() {
  const theme = useTheme();
  const { reader } = useDatabase();
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
          const savedLocations = await reader.listLocations();
          if (isActive) {
            setLocations(savedLocations);
          }
        } catch (error) {
          if (isActive) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to load saved locations.');
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
    }, [reader])
  );

  const countries = React.useMemo(() => getUniqueCountries(locations), [locations]);

  return (
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

      {!isLoading && countries.length === 0 ? (
        <Card mode="outlined" style={styles.emptyCard}>
          <Card.Content>
            <Text selectable variant="bodyMedium">
              No saved countries yet.
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      {countries.map((country) => (
        <Chip
          key={country}
          mode="flat"
          compact={false}
          style={styles.countryChip}
          onPress={() => router.push({ pathname: '/saved/[country]', params: { country } })}>
          {country}
        </Chip>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    gap: 18,
    padding: 16,
    paddingBottom: 32,
  },
  countryChip: {
    alignSelf: 'flex-start',
  },
  emptyCard: {
    borderRadius: 8,
  },
});

function getUniqueCountries(locations: Location[]) {
  return Array.from(
    new Set(
      locations
        .map((location) => location.country?.trim())
        .filter((country): country is string => Boolean(country))
    )
  ).sort((first, second) => first.localeCompare(second));
}
