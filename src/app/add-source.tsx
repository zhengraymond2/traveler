import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useFocusEffect } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, Divider, Portal, Surface, Text, TextInput, useTheme } from 'react-native-paper';

import { CountryRegionDropdown } from '@/components/country-region-dropdown';
import { AppColors } from '@/constants/theme';
import { useDatabase } from '@/db/database-provider';
import type { Location } from '@/db/schema';
import type { AddSourceResult } from '@/services/contracts';
import { useServices } from '@/services/app-services';
import { AddSourceFeedback } from '@/features/locations/add-source-feedback';
import { createAddSourceInput, mergePhotos, toSelectedPhoto, type SelectedPhoto } from '@/features/locations/add-source-helpers';

export default function AddSourceScreen() {
  const theme = useTheme();
  const { reader } = useDatabase();
  const { locationIntakeService } = useServices();
  const [locationName, setLocationName] = React.useState('');
  const [country, setCountry] = React.useState('');
  const [savedRegions, setSavedRegions] = React.useState<Location[]>([]);
  const [gpsCoordinates, setGpsCoordinates] = React.useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = React.useState('');
  const [instagramUrl, setInstagramUrl] = React.useState('');
  const [trailMapUrl, setTrailMapUrl] = React.useState('');
  const [photos, setPhotos] = React.useState<SelectedPhoto[]>([]);
  const [notes, setNotes] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [successResult, setSuccessResult] = React.useState<AddSourceResult | null>(null);

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
      const result = await locationIntakeService.addSource(
        createAddSourceInput({
          googleMapsUrl,
          gpsCoordinates,
          instagramUrl,
          locationName,
          notes,
          photos,
          trailMapUrl,
        })
      );

      setSuccessResult(result);
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
        testID="add-source-screen"
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
            testID="location-name-input"
            mode="outlined"
            label="Location name"
            placeholder="Cafe, hike, hotel, museum..."
            value={locationName}
            onChangeText={setLocationName}
          />

          <CountryRegionDropdown savedRegions={savedRegions} value={country} onChange={setCountry} />

          <TextInput
            testID="gps-coordinates-input"
            mode="outlined"
            label="GPS coordinates"
            placeholder="37.7749, -122.4194"
            keyboardType="numbers-and-punctuation"
            value={gpsCoordinates}
            onChangeText={setGpsCoordinates}
          />

          <TextInput
            testID="google-maps-url-input"
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
            testID="instagram-url-input"
            mode="outlined"
            label="Instagram link"
            placeholder="https://instagram.com/..."
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            value={instagramUrl}
            onChangeText={setInstagramUrl}
          />

          <TextInput
            testID="trail-map-url-input"
            mode="outlined"
            label="AllTrails or Footpath link"
            placeholder="https://www.alltrails.com/... or https://footpathapp.com/..."
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            value={trailMapUrl}
            onChangeText={setTrailMapUrl}
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
            testID="notes-input"
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
              testID="save-source-button"
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

      <Portal>
        <Dialog visible={Boolean(successResult)} onDismiss={handleDismissSuccess}>
          <Dialog.Title>Source added</Dialog.Title>
          <Dialog.Content>
            {successResult ? <AddSourceFeedback result={successResult} /> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button testID="add-source-success-done" onPress={handleDismissSuccess}>
              Done
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );

  function handleDismissSuccess() {
    setSuccessResult(null);
    router.back();
  }
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
