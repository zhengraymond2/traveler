import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';

import { AppColors } from '@/constants/theme';

type TripStartDateCalendarProps = {
  onSelectDate: (dateString: string) => void;
  selectedDate: string;
};

export function TripStartDateCalendar({ onSelectDate, selectedDate }: TripStartDateCalendarProps) {
  const markedDates = React.useMemo(() => {
    if (!selectedDate) {
      return {};
    }

    return {
      [selectedDate]: {
        disableTouchEvent: true,
        selected: true,
        selectedColor: AppColors.primary,
        selectedTextColor: AppColors.onPrimary,
      },
    };
  }, [selectedDate]);

  function handleDayPress(day: DateData) {
    onSelectDate(day.dateString);
  }

  return (
    <View style={styles.container}>
      <Calendar
        current={selectedDate || undefined}
        markedDates={markedDates}
        onDayPress={handleDayPress}
        theme={{
          arrowColor: AppColors.primary,
          calendarBackground: AppColors.surface,
          dayTextColor: AppColors.text,
          monthTextColor: AppColors.text,
          selectedDayBackgroundColor: AppColors.primary,
          selectedDayTextColor: AppColors.onPrimary,
          textDayFontWeight: '200',
          textMonthFontWeight: '200',
          textSectionTitleColor: AppColors.textMuted,
          textSectionTitleDisabledColor: AppColors.textTertiary,
          todayTextColor: AppColors.primary,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.surfaceVariant,
  },
});
