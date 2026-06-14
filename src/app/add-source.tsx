import { router, Stack } from 'expo-router';
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, Surface, Text, TextInput, useTheme } from 'react-native-paper';

import { useDatabase } from '@/db/database-provider';

export default function AddSourceScreen() {
  const theme = useTheme();
  const { writer } = useDatabase();
  const [locationName, setLocationName] = React.useState('');
  const [country, setCountry] = React.useState('');
  const [gpsCoordinates, setGpsCoordinates] = React.useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = React.useState('');
  const [instagramUrl, setInstagramUrl] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

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
      });

      router.back();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save source.');
    } finally {
      setIsSaving(false);
    }
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

          <TextInput
            mode="outlined"
            label="Country or region"
            placeholder="Japan, Portugal, Mexico City, Basque Country..."
            value={country}
            onChangeText={setCountry}
          />

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
            <Button mode="outlined" icon="image-plus" style={styles.photoButton}>
              Add photos
            </Button>
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
