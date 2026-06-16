import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useFocusEffect } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, Surface, Text, TextInput, useTheme } from 'react-native-paper';

import { CountryRegionDropdown } from '@/components/country-region-dropdown';
import { AppColors } from '@/constants/theme';
import { useDatabase } from '@/db/database-provider';
import type { Location } from '@/db/schema';

export default function AddSourceScreen() {
  const theme = useTheme();
  const { reader, writer } = useDatabase();
  const [locationName, setLocationName] = React.useState('');
  const [country, setCountry] = React.useState('');
  const [savedRegions, setSavedRegions] = React.useState<Location[]>([]);
  const [gpsCoordinates, setGpsCoordinates] = React.useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = React.useState('');
  const [instagramUrl, setInstagramUrl] = React.useState('');
  const [photos, setPhotos] = React.useState<SelectedPhoto[]>([]);
  const [notes, setNotes] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      async function loadSavedRegions() {
        try {
          const savedLocations = await reader.listLocations();
          if (isActive) {
            setSavedRegions(savedLocations);
          }
        } catch (error) {
          if (isActive) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to load saved regions.');
          }
        }
      }

      loadSavedRegions();

      return () => {
        isActive = false;
      };
    }, [reader])
  );

  async function handleSubmit() {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const coordinates = parseCoordinates(gpsCoordinates);

      await writer.createLocation({
        name: locationName,
        country,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        googleMapsUrl,
        instagramUrl,
        notes,
        photos: photos.map((photo) => ({ uri: photo.uri })),
      });

      router.back();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save source.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddPhotos() {
    setErrorMessage(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Photo library permission is required to add photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      orderedSelection: true,
      quality: 0.9,
      selectionLimit: 0,
    });

    if (result.canceled) {
      return;
    }

    setPhotos((currentPhotos) => mergePhotos(currentPhotos, result.assets.map(toSelectedPhoto)));
  }

  function handleRemovePhoto(uri: string) {
    setPhotos((currentPhotos) => currentPhotos.filter((photo) => photo.uri !== uri));
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Button compact mode="text" onPress={() => router.back()}>
              Cancel
            </Button>
          ),
        }}
      />

      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        <Surface mode="flat" style={styles.form}>
          <View style={styles.heading}>
            <Text selectable variant="titleMedium">
              New source
            </Text>
            <Text selectable variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Add anything you already know. Every field is optional.
            </Text>
          </View>

          {errorMessage ? (
            <Text selectable variant="bodyMedium" style={{ color: theme.colors.error }}>
              {errorMessage}
            </Text>
          ) : null}

          <TextInput
            mode="outlined"
            label="Location name"
            placeholder="Cafe, hike, hotel, museum..."
            value={locationName}
            onChangeText={setLocationName}
          />

          <CountryRegionDropdown savedRegions={savedRegions} value={country} onChange={setCountry} />

          <TextInput
            mode="outlined"
            label="GPS coordinates"
            placeholder="37.7749, -122.4194"
            keyboardType="numbers-and-punctuation"
            value={gpsCoordinates}
            onChangeText={setGpsCoordinates}
          />

          <TextInput
            mode="outlined"
            label="Google Maps link"
            placeholder="https://maps.google.com/..."
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            value={googleMapsUrl}
            onChangeText={setGoogleMapsUrl}
          />

          <TextInput
            mode="outlined"
            label="Instagram link"
            placeholder="https://instagram.com/..."
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            value={instagramUrl}
            onChangeText={setInstagramUrl}
          />

          <View style={styles.photoSection}>
            <Text selectable variant="labelLarge">
              Photos
            </Text>
            <Button mode="outlined" icon="image-plus" style={styles.photoButton} onPress={handleAddPhotos}>
              Add photos
            </Button>
            {photos.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoList}>
                {photos.map((photo) => (
                  <View key={photo.uri} style={styles.photoPreview}>
                    <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} contentFit="cover" />
                    <Pressable
                      accessibilityLabel={`Remove ${photo.fileName || 'photo'}`}
                      accessibilityRole="button"
                      style={styles.removePhotoButton}
                      onPress={() => handleRemovePhoto(photo.uri)}>
                      <Text selectable={false} variant="labelSmall" style={styles.removePhotoText}>
                        ×
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>

          <TextInput
            multiline
            mode="outlined"
            label="Notes"
            style={styles.textArea}
            placeholder="Dishes to order, hike details, blog notes, reminders..."
            value={notes}
            onChangeText={setNotes}
          />

          <Divider />

          <View style={styles.actions}>
            <Button mode="text" onPress={() => router.back()}>
              Cancel
            </Button>
            <Button
              mode="contained"
              icon="content-save"
              loading={isSaving}
              disabled={isSaving}
              style={styles.submitButton}
              onPress={handleSubmit}>
              Save source
            </Button>
          </View>
        </Surface>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  form: {
    gap: 18,
    borderRadius: 8,
    padding: 16,
  },
  heading: {
    gap: 4,
  },
  photoSection: {
    gap: 8,
  },
  photoButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
  },
  photoList: {
    gap: 10,
    paddingVertical: 2,
  },
  photoPreview: {
    position: 'relative',
  },
  photoThumbnail: {
    width: 78,
    height: 78,
    borderRadius: 8,
    backgroundColor: AppColors.surfaceMuted,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.scrim,
  },
  removePhotoText: {
    color: AppColors.textInverse,
    fontWeight: '800',
    lineHeight: 16,
  },
  textArea: {
    minHeight: 140,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  submitButton: {
    borderRadius: 8,
  },
});

type SelectedPhoto = {
  fileName?: string | null;
  uri: string;
};

function parseCoordinates(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const [latitudeText, longitudeText] = normalized.split(',').map((part) => part.trim());
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('GPS coordinates should look like "37.7749, -122.4194".');
  }

  return { latitude, longitude };
}

function toSelectedPhoto(asset: ImagePicker.ImagePickerAsset): SelectedPhoto {
  return {
    fileName: asset.fileName,
    uri: asset.uri,
  };
}

function mergePhotos(currentPhotos: SelectedPhoto[], newPhotos: SelectedPhoto[]) {
  const existingUris = new Set(currentPhotos.map((photo) => photo.uri));
  const uniqueNewPhotos = newPhotos.filter((photo) => {
    if (existingUris.has(photo.uri)) {
      return false;
    }
    existingUris.add(photo.uri);
    return true;
  });

  return [...currentPhotos, ...uniqueNewPhotos];
}
