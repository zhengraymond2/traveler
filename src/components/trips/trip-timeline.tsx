import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { ExpandedDayEvent } from './expanded-day-event';
import { TimelineDayRow } from './timeline-day-row';
import { TimelineInsertDivider } from './timeline-insert-divider';
import { AppColors } from '@/constants/theme';
import type { TripDayEventWithDetails } from '@/db/trips-repository';

export type CreateDetailEventDraft = {
  dayEventId: string;
  endMinute: number;
  startMinute: number;
};

type TripTimelineProps = {
  dayEvents: TripDayEventWithDetails[];
  onCreateDetailEvent: (draft: CreateDetailEventDraft) => void;
  onInsertDayEvent: (index: number) => void;
  startDate: Date | string | null;
};

export function TripTimeline({ dayEvents, onCreateDetailEvent, onInsertDayEvent, startDate }: TripTimelineProps) {
  const [expandedDayEventId, setExpandedDayEventId] = React.useState<string | null>(null);

  function toggleExpandedDayEvent(id: string) {
    setExpandedDayEventId((currentId) => (currentId === id ? null : id));
  }

  return (
    <View style={styles.container}>
      {dayEvents.map((dayEvent, index) => {
        const isExpanded = expandedDayEventId === dayEvent.id;

        return (
          <React.Fragment key={dayEvent.id}>
            <TimelineInsertDivider index={index} onInsert={onInsertDayEvent} />
            {isExpanded ? (
              <ExpandedDayEvent
                dayEvent={dayEvent}
                dayIndex={index}
                startDate={startDate}
                onCreateDetailEvent={onCreateDetailEvent}
                onToggle={() => toggleExpandedDayEvent(dayEvent.id)}
              />
            ) : (
              <TimelineDayRow
                dayEvent={dayEvent}
                dayIndex={index}
                startDate={startDate}
                onPress={() => toggleExpandedDayEvent(dayEvent.id)}
              />
            )}
          </React.Fragment>
        );
      })}
      <TimelineInsertDivider index={dayEvents.length} onInsert={onInsertDayEvent} />
      <View style={styles.bottomSpacer} />
      <LinearGradient
        pointerEvents="none"
        colors={[AppColors.overlayTransparent, AppColors.background]}
        style={styles.bottomFade}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingTop: 4,
  },
  bottomSpacer: {
    height: 100,
  },
  bottomFade: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 120,
  },
});
