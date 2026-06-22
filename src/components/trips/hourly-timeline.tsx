import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { DetailEventBlock } from './detail-event-block';
import { AppColors } from '@/constants/theme';
import type { TripDayEventWithDetails } from '@/db/trips-repository';
import { formatMinuteOfDay, snapMinuteToHalfHour } from '@/features/trips/trip-time';

const timelineHeight = 2400;
const minuteScale = timelineHeight / (24 * 60);

type HourlyTimelineProps = {
  dayEvent: TripDayEventWithDetails;
  onCreateDetailEvent: (draft: { endMinute: number; startMinute: number }) => void;
};

export function HourlyTimeline({ dayEvent, onCreateDetailEvent }: HourlyTimelineProps) {
  function handlePress(event: { nativeEvent?: { locationY?: number } }) {
    const startMinute = snapMinuteToHalfHour(event.nativeEvent?.locationY ?? 0, timelineHeight);
    onCreateDetailEvent({
      startMinute,
      endMinute: Math.min(24 * 60 - 1, startMinute + 60),
    });
  }

  return (
    <Pressable
      testID={`hourly-timeline-${dayEvent.id}`}
      accessibilityRole="button"
      style={styles.timeline}
      onPress={handlePress}>
      {Array.from({ length: 48 }).map((_, index) => {
        const minute = index * 30;

        return (
          <View key={minute} pointerEvents="none" style={[styles.halfHourLine, { top: minute * minuteScale }]}>
            <Text selectable={false} variant="labelSmall" style={styles.timeLabel}>
              {formatMinuteOfDay(minute)}
            </Text>
            <View style={styles.line} />
          </View>
        );
      })}

      {dayEvent.detailEvents.map((detailEvent) => (
        <DetailEventBlock key={detailEvent.id} detailEvent={detailEvent} minuteScale={minuteScale} />
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  timeline: {
    position: 'relative',
    height: timelineHeight,
    overflow: 'hidden',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: AppColors.outline,
  },
  halfHourLine: {
    position: 'absolute',
    right: 0,
    left: 0,
    minHeight: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    width: 46,
    color: AppColors.textTertiary,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.surfaceVariant,
  },
});
