import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppColors } from '@/constants/theme';
import type { TripDetailEventWithPhotos } from '@/db/trips-repository';
import { formatMinuteOfDay } from '@/features/trips/trip-time';

type DetailEventBlockProps = {
  detailEvent: TripDetailEventWithPhotos;
  minuteScale: number;
};

export function DetailEventBlock({ detailEvent, minuteScale }: DetailEventBlockProps) {
  const top = detailEvent.startMinute * minuteScale;
  const height = Math.max(40, (detailEvent.endMinute - detailEvent.startMinute) * minuteScale - 4);

  return (
    <View testID={`detail-event-block-${detailEvent.id}`} style={[styles.block, { top, height }]}>
      <Text selectable={false} variant="labelSmall" numberOfLines={1} style={styles.time}>
        {formatMinuteOfDay(detailEvent.startMinute)}
      </Text>
      <Text selectable={false} variant="bodySmall" numberOfLines={2} style={styles.title}>
        {detailEvent.title || 'Untitled event'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    position: 'absolute',
    right: 8,
    left: 58,
    borderRadius: 6,
    backgroundColor: AppColors.surfacePressed,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.primaryContainer,
    padding: 8,
  },
  time: {
    color: AppColors.textTertiary,
    fontWeight: '200',
  },
  title: {
    color: AppColors.text,
    fontWeight: '200',
  },
});
