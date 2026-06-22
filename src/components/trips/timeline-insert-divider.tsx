import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppColors } from '@/constants/theme';

type TimelineInsertDividerProps = {
  index: number;
  onInsert: (index: number) => void;
};

export function TimelineInsertDivider({ index, onInsert }: TimelineInsertDividerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Pressable
        accessibilityLabel={`Insert day at position ${index + 1}`}
        accessibilityRole="button"
        hitSlop={12}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => onInsert(index)}>
        <MaterialCommunityIcons name="plus" size={18} color={AppColors.textTertiary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
  },
  line: {
    position: 'absolute',
    right: 18,
    left: 18,
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.surfaceVariant,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppColors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.surfaceVariant,
  },
  buttonPressed: {
    backgroundColor: AppColors.surfacePressed,
  },
});
