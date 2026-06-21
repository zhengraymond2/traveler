import { router, useFocusEffect } from 'expo-router';
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

import { ImageListRow } from '@/components/image-list-row';
import { PulsingView } from '@/components/pulsing-view';
import { AppColors } from '@/constants/theme';
import { useDatabase } from '@/db/database-provider';
import type { LocationWithPhotos } from '@/db/repository';
import { getCountryRows } from '@/features/locations/saved-country-rows';

export default function SavedLocationsScreen() {
  const theme = useTheme();
  const { reader } = useDatabase();
  const [locations, setLocations] = React.useState<LocationWithPhotos[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      async function loadLocations() {
        setIsLoading(true);
        setErrorMessage(null);

        try {
          const savedLocations = await reader.listLocationsWithPhotos();
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

  const countries = React.useMemo(() => getCountryRows(locations), [locations]);

  return (
    <ScrollView
      testID="saved-locations-screen"
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

      {countries.map((country) => (
        <React.Fragment key={country.name}>
          <PulsingView active={isLoading}>
            <ImageListRow
              accessibilityLabel={`Open saved locations for ${country.name}`}
              imageUri={country.imageUri}
              isLoading={isLoading}
              testID={`saved-country-row-${country.name}`}
              title={country.name}
              onPress={() => router.push({ pathname: '/saved/[country]', params: { country: country.name } })}
            />
          </PulsingView>
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
    gap: 1,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  emptyCard: {
    borderRadius: 8,
  },
  skeletonCountryContent: {
    gap: 1,
  },
  skeletonCountryRow: {
    height: 130,
    borderRadius: 0,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: AppColors.surfaceMuted,
  },
  skeletonCountryLine: {
    width: '48%',
    height: 20,
    borderRadius: 6,
    backgroundColor: AppColors.surface,
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
