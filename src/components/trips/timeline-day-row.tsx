import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppColors } from '@/constants/theme';
import type { TripDayEventWithDetails } from '@/db/trips-repository';
import { getDayTimelineLabel, getExpandedDayTitle } from '@/features/trips/trip-date-labels';

type TimelineDayRowProps = {
  dayEvent: TripDayEventWithDetails;
  dayIndex: number;
  onPress: () => void;
  startDate: Date | string | null;
};

export function TimelineDayRow({ dayEvent, dayIndex, onPress, startDate }: TimelineDayRowProps) {
  const label = getDayTimelineLabel(dayIndex, startDate);
  const title = getExpandedDayTitle(dayIndex, startDate, dayEvent.title);

  return (
    <Pressable
      testID={`timeline-day-row-${dayEvent.id}`}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}>
      <View style={styles.dateColumn}>
        <Text selectable={false} variant="titleMedium" style={styles.datePrimary}>
          {label.primary}
        </Text>
        {label.secondary ? (
          <Text selectable={false} variant="bodySmall" style={styles.dateSecondary}>
            {label.secondary}
          </Text>
        ) : null}
      </View>

      <View style={styles.timelineColumn}>
        <View style={styles.verticalLine} />
        <View style={styles.dot} />
      </View>

      <View style={styles.summaryColumn}>
        <View style={styles.photoIcon}>
          <MaterialCommunityIcons name="image-outline" size={18} color={AppColors.textMuted} />
        </View>
        <View style={styles.nameColumn}>
          <Text selectable={false} variant="titleSmall" numberOfLines={2} style={styles.name}>
            {title}
          </Text>
        </View>
        <Text selectable={false} variant="bodySmall" numberOfLines={3} style={styles.description}>
          {dayEvent.description || 'Add plans for this day.'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 180,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 18,
  },
  rowPressed: {
    backgroundColor: AppColors.surfaceMuted,
  },
  dateColumn: {
    width: 72,
    alignItems: 'center',
    gap: 2,
  },
  datePrimary: {
    color: AppColors.text,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
  dateSecondary: {
    color: AppColors.textTertiary,
    fontWeight: '200',
  },
  timelineColumn: {
    width: 32,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.outline,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppColors.text,
  },
  summaryColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photoIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AppColors.surfaceMuted,
  },
  nameColumn: {
    width: 92,
  },
  name: {
    color: AppColors.text,
    fontWeight: '200',
  },
  description: {
    flex: 1,
    color: AppColors.textSecondary,
    fontWeight: '200',
  },
});
