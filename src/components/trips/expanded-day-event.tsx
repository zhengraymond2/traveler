import * as React from 'react';
import { Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { Text } from 'react-native-paper';

import { HourlyTimeline } from './hourly-timeline';
import type { CreateDetailEventDraft } from './trip-timeline';
import { AppColors } from '@/constants/theme';
import type { TripDayEventWithDetails } from '@/db/trips-repository';
import { getExpandedDayTitle } from '@/features/trips/trip-date-labels';

type ExpandedDayEventProps = {
  dayEvent: TripDayEventWithDetails;
  dayIndex: number;
  onCreateDetailEvent: (draft: CreateDetailEventDraft) => void;
  onToggle: () => void;
  startDate: Date | string | null;
};

export function ExpandedDayEvent({
  dayEvent,
  dayIndex,
  onCreateDetailEvent,
  onToggle,
  startDate,
}: ExpandedDayEventProps) {
  const { height } = useWindowDimensions();
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState(dayEvent.title ?? '');
  const minHeight = Math.max(height * 0.8, 520);
  const title = getExpandedDayTitle(dayIndex, startDate, draftTitle || dayEvent.title);

  return (
    <View testID={`expanded-day-event-${dayEvent.id}`} style={[styles.container, { minHeight }]}>
      {isEditingTitle ? (
        <TextInput
          autoFocus
          accessibilityLabel="Edit day title"
          style={styles.titleInput}
          value={draftTitle}
          onBlur={() => setIsEditingTitle(false)}
          onChangeText={setDraftTitle}
          onSubmitEditing={() => setIsEditingTitle(false)}
        />
      ) : (
        <Pressable accessibilityRole="button" onLongPress={() => setIsEditingTitle(true)} onPress={onToggle}>
          <Text selectable={false} variant="headlineSmall" style={styles.title}>
            {title}
          </Text>
        </Pressable>
      )}

      <HourlyTimeline
        dayEvent={dayEvent}
        onCreateDetailEvent={(draft) =>
          onCreateDetailEvent({
            dayEventId: dayEvent.id,
            ...draft,
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 18,
    paddingRight: 16,
    paddingLeft: 72,
    backgroundColor: AppColors.background,
  },
  title: {
    color: AppColors.text,
    fontWeight: '200',
    paddingBottom: 16,
  },
  titleInput: {
    minHeight: 44,
    color: AppColors.text,
    fontSize: 24,
    fontWeight: '200',
    paddingBottom: 16,
  },
});
