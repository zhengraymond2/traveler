import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { getLocationCategoryAppearance, type LocationCategoryKind } from '@/constants/location-categories';
import { AppColors } from '@/constants/theme';

type CategoryChipProps = {
  category: LocationCategoryKind | string;
};

export function CategoryChip({ category }: CategoryChipProps) {
  const appearance = getLocationCategoryAppearance(category);

  return (
    <View style={[styles.chip, { borderColor: appearance.color }]}>
      <Text selectable={false} variant="labelMedium" style={[styles.glyph, { color: appearance.color }]}>
        {appearance.glyph}
      </Text>
      <Text selectable={false} variant="labelMedium" style={styles.label}>
        {appearance.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: AppColors.surface,
  },
  glyph: {
    fontWeight: '200',
  },
  label: {
    color: AppColors.text,
    fontWeight: '200',
  },
});
