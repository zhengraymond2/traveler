import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppColors } from '@/constants/theme';

export function ImageListRow({
  accessibilityLabel,
  imageUri,
  isLoading = false,
  onPress,
  testID,
  title,
}: {
  accessibilityLabel: string;
  imageUri?: string;
  isLoading?: boolean;
  onPress: () => void;
  testID?: string;
  title: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={isLoading}
      testID={testID}
      style={[styles.row, isLoading && styles.rowLoading]}
      onPress={onPress}>
      {imageUri ? <Image source={{ uri: imageUri }} style={styles.rowImage} contentFit="cover" /> : <View style={styles.rowFallbackOverlay} />}
      <LinearGradient
        colors={[AppColors.overlayTransparent, AppColors.overlaySoft, AppColors.overlayStrong]}
        locations={[0, 0.45, 1]}
        style={styles.rowGradient}>
        <Text selectable={false} variant="headlineSmall" numberOfLines={1} style={styles.rowTitle}>
          {title}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 180,
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: AppColors.surfaceVariant,
  },
  rowLoading: {
    backgroundColor: AppColors.surfaceMuted,
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
  rowTitle: {
    color: AppColors.textInverse,
    fontWeight: '800',
    textShadowColor: AppColors.textShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
