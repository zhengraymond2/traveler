import { router, useFocusEffect } from 'expo-router';
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Divider, List, Text, useTheme } from 'react-native-paper';

import { PulsingView } from '@/components/pulsing-view';
import { useDatabase } from '@/db/database-provider';
import type { Location } from '@/db/schema';

const unknownCountryLabel = 'Unknown';

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

      {!isLoading && countries.length === 0 ? (
        <Card mode="outlined" style={styles.emptyCard}>
          <Card.Content>
            <Text selectable variant="bodyMedium">
              No saved countries yet.
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      {isLoading && countries.length === 0 ? <LoadingCountryRows /> : null}

      {countries.map((country, index) => (
        <React.Fragment key={country}>
          <PulsingView active={isLoading}>
            <List.Item
              title={country}
              style={[styles.countryRow, isLoading && styles.countryRowLoading]}
              onPress={isLoading ? undefined : () => router.push({ pathname: '/saved/[country]', params: { country } })}
            />
          </PulsingView>
          {index < countries.length - 1 ? <Divider style={styles.countryDivider} /> : null}
        </React.Fragment>
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
  countryRow: {
    borderRadius: 8,
    backgroundColor: '#fffbff',
  },
  countryRowLoading: {
    backgroundColor: '#f3f4f6',
  },
  countryDivider: {
    backgroundColor: '#d8d8d8',
    height: StyleSheet.hairlineWidth,
  },
  emptyCard: {
    borderRadius: 8,
  },
  skeletonCountryContent: {
    gap: 18,
  },
  skeletonCountryRow: {
    height: 64,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
  },
  skeletonCountryLine: {
    width: '48%',
    height: 16,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
});

function LoadingCountryRows() {
  return (
    <View style={styles.skeletonCountryContent}>
      {Array.from({ length: 5 }).map((_, index) => (
        <PulsingView key={index} active>
          <View style={styles.skeletonCountryRow}>
            <View style={styles.skeletonCountryLine} />
          </View>
        </PulsingView>
      ))}
    </View>
  );
}

function getUniqueCountries(locations: Location[]) {
  const countries = Array.from(
    new Set(
      locations
        .map((location) => location.country?.trim())
        .filter((country): country is string => Boolean(country))
    )
  ).sort((first, second) => first.localeCompare(second));

  const hasUnknownCountry = locations.some((location) => !location.country?.trim());
  return hasUnknownCountry ? [...countries, unknownCountryLabel] : countries;
}
