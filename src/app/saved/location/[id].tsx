import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Card, Snackbar, Text, useTheme } from 'react-native-paper';

import { AppColors } from '@/constants/theme';
import { useDatabase } from '@/db/database-provider';
import type { LocationWithPhotos } from '@/db/repository';

export default function SavedLocationDetailScreen() {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { reader } = useDatabase();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = normalizeParam(params.id);
  const [location, setLocation] = React.useState<LocationWithPhotos | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [copyMessageVisible, setCopyMessageVisible] = React.useState(false);
  const galleryGap = 2;
  const galleryItemSize = Math.floor((windowWidth - 32 - galleryGap * 2) / 3);

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
          <View style={styles.detail}>
            <View style={styles.header}>
              <Text selectable variant="displaySmall" style={styles.title}>
                {getLocationTitle(location)}
              </Text>
              {location.country ? (
                <Text selectable variant="titleMedium" style={styles.country}>
                  {location.country}
                </Text>
              ) : null}
              {formatCoordinates(location) ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Copy GPS coordinates"
                  onPress={() => handleCopyCoordinates(formatCoordinates(location))}>
                  <Text selectable variant="bodyMedium" style={styles.coordinates}>
                    {formatCoordinates(location)}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.links}>
              <DetailLink label="Google Maps" url={getGoogleMapsUrl(location)} />
              {location.instagramUrl ? <DetailLink label="Instagram" url={location.instagramUrl} /> : null}
            </View>

            {location.notes ? (
              <Text selectable variant="bodySmall" style={styles.notes}>
                {location.notes}
              </Text>
            ) : null}

            {location.photos.length ? (
              <View style={[styles.gallery, { gap: galleryGap }]}>
                {location.photos.map((photo) => (
                  <Image
                    key={photo.id}
                    source={{ uri: photo.uri }}
                    style={[
                      styles.galleryImage,
                      {
                        width: galleryItemSize,
                        height: galleryItemSize,
                      },
                    ]}
                    contentFit="cover"
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <Snackbar
        visible={copyMessageVisible}
        duration={1400}
        onDismiss={() => setCopyMessageVisible(false)}>
        GPS coordinates copied
      </Snackbar>
    </>
  );

  async function handleCopyCoordinates(value: string | undefined) {
    if (!value) {
      return;
    }

    await Clipboard.setStringAsync(value);
    setCopyMessageVisible(true);
  }
}

function DetailLink({ label, url }: { label: string; url: string }) {
  return (
    <Pressable accessibilityRole="link" style={styles.linkRow} onPress={() => Linking.openURL(url)}>
      <Text variant="titleMedium" style={styles.linkText}>
        {label} ↗
      </Text>
    </Pressable>
  );
}

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatCoordinates(location: LocationWithPhotos) {
  if (location.latitude == null || location.longitude == null) {
    return undefined;
  }

  return `(${location.latitude}, ${location.longitude})`;
}

function getLocationTitle(location: LocationWithPhotos) {
  return location.name || 'Untitled location';
}

function getGoogleMapsUrl(location: LocationWithPhotos) {
  if (location.googleMapsUrl) {
    return location.googleMapsUrl;
  }

  const query = [getLocationTitle(location), location.country].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 8,
  },
  detail: {
    gap: 24,
  },
  header: {
    gap: 6,
  },
  title: {
    color: AppColors.text,
    fontWeight: '800',
    lineHeight: 48,
  },
  country: {
    color: AppColors.textMuted,
    fontSize: 24,
    fontWeight: 'ultralight',
  },
  coordinates: {
    color: AppColors.textTertiary,
    fontStyle: 'italic',
    textDecorationLine: 'underline',
    fontWeight: 'ultralight',
  },
  links: {
    gap: 10,
  },
  linkRow: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  linkText: {
    color: AppColors.primary,
    fontWeight: '700',
  },
  notes: {
    color: AppColors.bodyText,
    lineHeight: 18,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  galleryImage: {
    backgroundColor: AppColors.surfaceMuted,
  },
});
