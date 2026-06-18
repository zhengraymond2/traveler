import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Card, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';

import { AppColors } from '@/constants/theme';
import { useDatabase } from '@/db/database-provider';
import type { LocationWithPhotos } from '@/db/repository';

export default function SavedLocationDetailScreen() {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { reader, writer } = useDatabase();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = normalizeParam(params.id);
  const [location, setLocation] = React.useState<LocationWithPhotos | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [copyMessageVisible, setCopyMessageVisible] = React.useState(false);
  const [form, setForm] = React.useState<LocationEditForm>(emptyLocationEditForm);
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
            setForm(createEditForm(savedLocation));
            setIsEditing(false);
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
          headerRight: () =>
            location && !isEditing ? (
              <Button compact mode="text" onPress={handleStartEditing}>
                Edit
              </Button>
            ) : null,
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
            {isEditing ? (
              <LocationEditFormView
                form={form}
                isSaving={isSaving}
                onCancel={handleCancelEditing}
                onChange={setForm}
                onSave={handleSaveEditing}
              />
            ) : (
              <>
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
                  {location.trailMapUrl ? (
                    <DetailLink label="AllTrails / Footpath" url={location.trailMapUrl} />
                  ) : null}
                </View>

                {location.notes ? (
                  <Text selectable variant="bodySmall" style={styles.notes}>
                    {location.notes}
                  </Text>
                ) : null}
              </>
            )}

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

  function handleStartEditing() {
    setErrorMessage(null);
    setForm(createEditForm(location));
    setIsEditing(true);
  }

  function handleCancelEditing() {
    setErrorMessage(null);
    setForm(createEditForm(location));
    setIsEditing(false);
  }

  async function handleSaveEditing() {
    if (!location) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const coordinates = parseEditableCoordinates(form.gpsCoordinates);
      await writer.updateLocation(location.id, {
        category: form.category,
        country: form.country,
        googleMapsUrl: form.googleMapsUrl,
        instagramUrl: form.instagramUrl,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        name: form.name,
        notes: form.notes,
        trailMapUrl: form.trailMapUrl,
      });

      const savedLocation = await reader.getLocation(location.id);
      setLocation(savedLocation);
      setForm(createEditForm(savedLocation));
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update saved location.');
    } finally {
      setIsSaving(false);
    }
  }
}

type LocationEditForm = {
  category: string;
  country: string;
  googleMapsUrl: string;
  gpsCoordinates: string;
  instagramUrl: string;
  name: string;
  notes: string;
  trailMapUrl: string;
};

const emptyLocationEditForm: LocationEditForm = {
  category: '',
  country: '',
  googleMapsUrl: '',
  gpsCoordinates: '',
  instagramUrl: '',
  name: '',
  notes: '',
  trailMapUrl: '',
};

function LocationEditFormView({
  form,
  isSaving,
  onCancel,
  onChange,
  onSave,
}: {
  form: LocationEditForm;
  isSaving: boolean;
  onCancel: () => void;
  onChange: React.Dispatch<React.SetStateAction<LocationEditForm>>;
  onSave: () => void;
}) {
  function updateForm(field: keyof LocationEditForm) {
    return (value: string) => {
      onChange((currentForm) => ({ ...currentForm, [field]: value }));
    };
  }

  return (
    <View style={styles.editForm}>
      <TextInput
        mode="outlined"
        label="Location name"
        value={form.name}
        onChangeText={updateForm('name')}
      />
      <TextInput
        mode="outlined"
        label="Country or region"
        value={form.country}
        onChangeText={updateForm('country')}
      />
      <TextInput
        mode="outlined"
        label="Category"
        placeholder="Hiking, restaurant, hotel, transit..."
        value={form.category}
        onChangeText={updateForm('category')}
      />
      <TextInput
        mode="outlined"
        label="GPS coordinates"
        keyboardType="numbers-and-punctuation"
        value={form.gpsCoordinates}
        onChangeText={updateForm('gpsCoordinates')}
      />
      <TextInput
        mode="outlined"
        label="Google Maps link"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        value={form.googleMapsUrl}
        onChangeText={updateForm('googleMapsUrl')}
      />
      <TextInput
        mode="outlined"
        label="Instagram link"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        value={form.instagramUrl}
        onChangeText={updateForm('instagramUrl')}
      />
      <TextInput
        mode="outlined"
        label="AllTrails or Footpath link"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        value={form.trailMapUrl}
        onChangeText={updateForm('trailMapUrl')}
      />
      <TextInput
        multiline
        mode="outlined"
        label="Notes"
        style={styles.editNotes}
        value={form.notes}
        onChangeText={updateForm('notes')}
      />
      <View style={styles.editActions}>
        <Button mode="text" disabled={isSaving} onPress={onCancel}>
          Cancel
        </Button>
        <Button mode="contained" loading={isSaving} disabled={isSaving} onPress={onSave}>
          Save
        </Button>
      </View>
    </View>
  );
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

function formatEditableCoordinates(location: LocationWithPhotos | null) {
  if (!location || location.latitude == null || location.longitude == null) {
    return '';
  }

  return `${location.latitude}, ${location.longitude}`;
}

function parseEditableCoordinates(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return { latitude: null, longitude: null };
  }

  const [latitudeText, longitudeText] = normalized.split(',').map((part) => part.trim());
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('GPS coordinates should look like "37.7749, -122.4194".');
  }

  return { latitude, longitude };
}

function createEditForm(location: LocationWithPhotos | null): LocationEditForm {
  if (!location) {
    return emptyLocationEditForm;
  }

  return {
    category: location.category ?? '',
    country: location.country ?? '',
    googleMapsUrl: location.googleMapsUrl ?? '',
    gpsCoordinates: formatEditableCoordinates(location),
    instagramUrl: location.instagramUrl ?? '',
    name: location.name ?? '',
    notes: location.notes ?? '',
    trailMapUrl: location.trailMapUrl ?? '',
  };
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
  editForm: {
    gap: 14,
  },
  editNotes: {
    minHeight: 120,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  galleryImage: {
    backgroundColor: AppColors.surfaceMuted,
  },
});
