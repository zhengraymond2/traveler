import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

import { PulsingView } from '@/components/pulsing-view';
import { AppColors } from '@/constants/theme';
import { useDatabase } from '@/db/database-provider';
import type { LocationWithPhotos } from '@/db/repository';

const unknownCountryLabel = 'Unknown';

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
            <CountryRow
              country={country.name}
              imageUri={country.imageUri}
              isLoading={isLoading}
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
  countryRow: {
    height: 180,
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: AppColors.surfaceVariant,
  },
  countryRowLoading: {
    backgroundColor: AppColors.surfaceMuted,
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
  rowImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  rowGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    padding: 16,
  },
  rowFallbackOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: AppColors.imageFallback,
  },
  countryTitle: {
    color: AppColors.textInverse,
    fontWeight: '800',
    textShadowColor: AppColors.textShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});

type CountryRowData = {
  imageUri?: string;
  name: string;
};

function CountryRow({
  country,
  imageUri,
  isLoading,
  onPress,
}: {
  country: string;
  imageUri?: string;
  isLoading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable disabled={isLoading} style={[styles.countryRow, isLoading && styles.countryRowLoading]} onPress={onPress}>
      {imageUri ? <Image source={{ uri: imageUri }} style={styles.rowImage} contentFit="cover" /> : <View style={styles.rowFallbackOverlay} />}
      <LinearGradient
        colors={[AppColors.overlayTransparent, AppColors.overlaySoft, AppColors.overlayStrong]}
        locations={[0, 0.45, 1]}
        style={styles.rowGradient}>
        <Text selectable={false} variant="headlineSmall" numberOfLines={1} style={styles.countryTitle}>
          {country}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

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

function getCountryRows(locations: LocationWithPhotos[]): CountryRowData[] {
  const countries = Array.from(new Set(locations.map(getCountryName))).sort((first, second) =>
    first === unknownCountryLabel ? 1 : second === unknownCountryLabel ? -1 : first.localeCompare(second)
  );

  return countries.map((country) => {
    const countryLocations = locations.filter((location) => getCountryName(location) === country);
    return {
      name: country,
      imageUri: getStableRandomPhotoUri(country, countryLocations),
    };
  });
}

function getCountryName(location: LocationWithPhotos) {
  return location.country?.trim() || unknownCountryLabel;
}

function getStableRandomPhotoUri(seed: string, locations: LocationWithPhotos[]) {
  const photos = locations.flatMap((location) => location.photos);
  if (!photos.length) {
    return undefined;
  }

  return photos[hashString(seed) % photos.length]?.uri;
}

function hashString(value: string) {
  return Array.from(value).reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0);
}
