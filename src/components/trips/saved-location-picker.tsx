import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

import { AppColors } from '@/constants/theme';

export type SavedTripLocation = {
  googleMapsUrl: string | null;
  id: string;
  name: string | null;
};

type SavedLocationPickerProps = {
  disabled?: boolean;
  locations: SavedTripLocation[];
  onSelect: (location: SavedTripLocation | null) => void;
  selectedLocation: SavedTripLocation | null;
};

export function SavedLocationPicker({
  disabled = false,
  locations,
  onSelect,
  selectedLocation,
}: SavedLocationPickerProps) {
  const [query, setQuery] = React.useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredLocations = locations
    .filter((location) => location.name?.trim())
    .filter((location) => {
      if (!normalizedQuery) {
        return false;
      }

      return location.name?.toLocaleLowerCase().includes(normalizedQuery);
    })
    .slice(0, 5);

  if (selectedLocation) {
    return (
      <View style={styles.selectedContainer}>
        <Text selectable={false} variant="bodyMedium" style={styles.selectedText}>
          {selectedLocation.name}
        </Text>
        <Pressable accessibilityRole="button" onPress={() => onSelect(null)}>
          <Text selectable={false} variant="labelMedium" style={styles.clearText}>
            Clear location
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        testID="saved-location-search-input"
        mode="outlined"
        label="Saved location"
        editable={!disabled}
        value={query}
        onChangeText={setQuery}
      />
      {filteredLocations.length ? (
        <View style={styles.results}>
          {filteredLocations.map((location) => (
            <Pressable
              key={location.id}
              accessibilityRole="button"
              style={styles.resultRow}
              onPress={() => onSelect(location)}>
              <Text selectable={false} variant="bodyMedium" style={styles.resultText}>
                {location.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  selectedContainer: {
    gap: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.surfaceVariant,
    padding: 10,
    backgroundColor: AppColors.surfaceMuted,
  },
  selectedText: {
    color: AppColors.text,
    fontWeight: '200',
  },
  clearText: {
    color: AppColors.primary,
    fontWeight: '200',
  },
  results: {
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.surfaceVariant,
  },
  resultRow: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: AppColors.surface,
  },
  resultText: {
    color: AppColors.text,
    fontWeight: '200',
  },
});
