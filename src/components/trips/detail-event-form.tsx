import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';

import { AddressPicker } from './address-picker';
import { CategoryChip } from './category-chip';
import { SavedLocationPicker, type SavedTripLocation } from './saved-location-picker';
import { LocationCategoryAppearances, type LocationCategoryKind } from '@/constants/location-categories';
import { AppColors } from '@/constants/theme';
import type { CreateDetailEventDraft } from './trip-timeline';
import { getDetailEventMapsUrl } from '@/features/trips/trip-maps';
import { formatMinuteOfDay } from '@/features/trips/trip-time';

export type DetailEventFormSaveInput = {
  addressText: string | null;
  category: string | null;
  dayEventId: string;
  description: string | null;
  endMinute: number;
  googleMapsUrl: string | null;
  locationId: string | null;
  photos: { uri: string }[];
  startMinute: number;
  title: string | null;
};

type DetailEventFormProps = {
  draft: CreateDetailEventDraft;
  onCancel: () => void;
  onSave: (input: DetailEventFormSaveInput) => void | Promise<void>;
  savedLocations: SavedTripLocation[];
  visible: boolean;
};

const categoryOptions = Object.values(LocationCategoryAppearances);

export function DetailEventForm({ draft, onCancel, onSave, savedLocations, visible }: DetailEventFormProps) {
  const [title, setTitle] = React.useState('');
  const [fromTime, setFromTime] = React.useState(formatMinuteOfDay(draft.startMinute));
  const [toTime, setToTime] = React.useState(formatMinuteOfDay(draft.endMinute));
  const [category, setCategory] = React.useState<LocationCategoryKind | null>(null);
  const [isCategoryMenuVisible, setIsCategoryMenuVisible] = React.useState(false);
  const [selectedLocation, setSelectedLocation] = React.useState<SavedTripLocation | null>(null);
  const [addressText, setAddressText] = React.useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState('');
  const [photos, setPhotos] = React.useState<{ uri: string }[]>([]);

  React.useEffect(() => {
    setFromTime(formatMinuteOfDay(draft.startMinute));
    setToTime(formatMinuteOfDay(draft.endMinute));
  }, [draft.endMinute, draft.startMinute]);

  const mapsUrl = getDetailEventMapsUrl({
    addressText,
    googleMapsUrl,
    savedLocation: selectedLocation,
  });
  const hasAddressText = Boolean(addressText.trim());

  async function handleUploadPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      orderedSelection: true,
      quality: 0.9,
      selectionLimit: 0,
    });

    if (!result.canceled) {
      setPhotos((currentPhotos) => [...currentPhotos, ...result.assets.map((asset) => ({ uri: asset.uri }))]);
    }
  }

  async function handleSave() {
    await onSave({
      addressText: normalizeText(addressText),
      category,
      dayEventId: draft.dayEventId,
      description: normalizeText(description),
      endMinute: parseTimeText(toTime, draft.endMinute),
      googleMapsUrl,
      locationId: selectedLocation?.id ?? null,
      photos,
      startMinute: parseTimeText(fromTime, draft.startMinute),
      title: normalizeText(title),
    });
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel}>
        <Dialog.Title>
          <View style={styles.titleRow}>
            <Text selectable={false} variant="titleLarge" style={styles.dialogTitle}>
              Detail Event
            </Text>
            <Button compact onPress={onCancel}>
              X
            </Button>
          </View>
        </Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={styles.content}>
            <TextInput
              testID="detail-event-title-input"
              mode="outlined"
              label="Name"
              value={title}
              onChangeText={setTitle}
            />

            <View style={styles.timeRow}>
              <TextInput mode="outlined" label="From" value={fromTime} style={styles.timeInput} onChangeText={setFromTime} />
              <TextInput mode="outlined" label="To" value={toTime} style={styles.timeInput} onChangeText={setToTime} />
            </View>

            <Button mode="outlined" onPress={() => setIsCategoryMenuVisible((value) => !value)}>
              Category
            </Button>
            {isCategoryMenuVisible ? (
              <View style={styles.categoryMenu}>
                {categoryOptions.map((option) => (
                  <Pressable
                    key={option.kind}
                    accessibilityRole="button"
                    style={styles.categoryOption}
                    onPress={() => {
                      setCategory(option.kind);
                      setIsCategoryMenuVisible(false);
                    }}>
                    <Text selectable={false} variant="labelMedium" style={{ color: option.color }}>
                      {option.glyph}
                    </Text>
                    <Text selectable={false} variant="bodyMedium" style={styles.categoryOptionText}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {category ? <CategoryChip category={category} /> : null}

            <SavedLocationPicker
              disabled={hasAddressText}
              locations={savedLocations}
              selectedLocation={selectedLocation}
              onSelect={setSelectedLocation}
            />

            <Text selectable={false} variant="labelMedium" style={styles.orText}>
              or
            </Text>

            <AddressPicker
              disabled={Boolean(selectedLocation)}
              googleMapsUrl={googleMapsUrl}
              value={addressText}
              onChangeAddress={setAddressText}
              onChangeGoogleMapsUrl={setGoogleMapsUrl}
            />

            {mapsUrl ? (
              <Button
                compact
                mode="outlined"
                onPress={() => {
                  void Linking.openURL(mapsUrl);
                }}>
                navigate on maps
              </Button>
            ) : null}

            <TextInput
              mode="outlined"
              label="Description"
              multiline
              value={description}
              onChangeText={setDescription}
            />

            {photos.length ? (
              <View style={styles.gallery}>
                {photos.map((photo) => (
                  <Image key={photo.uri} source={{ uri: photo.uri }} style={styles.photo} />
                ))}
              </View>
            ) : null}

            <Button mode="outlined" onPress={handleUploadPhotos}>
              Upload photos
            </Button>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onCancel}>Cancel</Button>
          <Button onPress={handleSave}>Save</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function parseTimeText(value: string, fallback: number) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return fallback;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return fallback;
  }

  return hours * 60 + minutes;
}

function normalizeText(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

const styles = StyleSheet.create({
  titleRow: {
    minWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dialogTitle: {
    color: AppColors.text,
    fontWeight: '200',
  },
  content: {
    gap: 12,
    paddingVertical: 12,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeInput: {
    flex: 1,
  },
  orText: {
    alignSelf: 'center',
    color: AppColors.textTertiary,
    fontWeight: '200',
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryMenu: {
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.surfaceVariant,
  },
  categoryOption: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: AppColors.surface,
  },
  categoryOptionText: {
    color: AppColors.text,
    fontWeight: '200',
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 6,
    backgroundColor: AppColors.imageFallback,
  },
});
