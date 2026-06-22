import { useGoogleAutocomplete } from '@appandflow/react-native-google-autocomplete';
import type { GoogleLocationResult } from '@appandflow/react-native-google-autocomplete';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

import { AppColors } from '@/constants/theme';

type AddressPickerProps = {
  disabled?: boolean;
  googleMapsUrl: string | null;
  onChangeAddress: (value: string) => void;
  onChangeGoogleMapsUrl: (value: string | null) => void;
  value: string;
};

const googleMapsHosts = ['google.com/maps', 'maps.google.', 'maps.app.goo.gl', 'goo.gl/maps'];

export function AddressPicker({
  disabled = false,
  googleMapsUrl: _googleMapsUrl,
  onChangeAddress,
  onChangeGoogleMapsUrl,
  value,
}: AddressPickerProps) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const { locationResults, searchDetails, setTerm } = useGoogleAutocomplete(apiKey, {
    debounce: 300,
    language: 'en',
    minLength: apiKey ? 2 : Number.MAX_SAFE_INTEGER,
  });

  async function handleSelectResult(result: GoogleLocationResult) {
    const details = await searchDetails(result.place_id);
    onChangeAddress(details.formatted_address || result.description);
    onChangeGoogleMapsUrl(details.url || null);
  }

  function handleChangeText(text: string) {
    onChangeAddress(text);
    setTerm(text);
    onChangeGoogleMapsUrl(isGoogleMapsUrl(text) ? text.trim() : null);
  }

  return (
    <View style={styles.container}>
      <TextInput
        testID="address-picker-input"
        mode="outlined"
        label={apiKey ? 'Address or Google Maps link' : 'Address or pasted Google Maps link'}
        editable={!disabled}
        value={value}
        onChangeText={handleChangeText}
      />
      {apiKey && !disabled && locationResults.length ? (
        <View style={styles.results}>
          {locationResults.slice(0, 5).map((result) => (
            <Pressable
              key={result.place_id}
              accessibilityRole="button"
              style={styles.resultRow}
              onPress={() => {
                void handleSelectResult(result);
              }}>
              <Text selectable={false} variant="bodyMedium" numberOfLines={1} style={styles.resultTitle}>
                {result.structured_formatting.main_text}
              </Text>
              <Text selectable={false} variant="bodySmall" numberOfLines={1} style={styles.resultDetail}>
                {result.structured_formatting.secondary_text}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function isGoogleMapsUrl(value: string) {
  const normalizedValue = value.trim().toLocaleLowerCase();
  return googleMapsHosts.some((host) => normalizedValue.includes(host));
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  results: {
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.surfaceVariant,
  },
  resultRow: {
    gap: 2,
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: AppColors.surface,
  },
  resultTitle: {
    color: AppColors.text,
    fontWeight: '200',
  },
  resultDetail: {
    color: AppColors.textMuted,
    fontWeight: '200',
  },
});
