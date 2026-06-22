import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TripTimeline } from '../trip-timeline';
import type { TripDayEventWithDetails } from '@/db/trips-repository';
import { UITestHelper } from '@/test/UITestHelper';

const baseDate = new Date('2026-06-22T12:00:00.000Z');

jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    LinearGradient: (props: unknown) => <View {...(props as object)} />,
  };
});

describe('TripTimeline', () => {
  test('renders collapsed day rows with 180px height and insertion dividers', async () => {
    const screen = await UITestHelper.renderWithPaper(
      <TripTimeline
        dayEvents={[day({ id: 'day-1', position: 0 }), day({ id: 'day-2', position: 1 })]}
        startDate={null}
        onCreateDetailEvent={jest.fn()}
        onInsertDayEvent={jest.fn()}
      />
    );

    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('timeline-day-row-day-1').props.style)).toMatchObject({
      height: 180,
    });
    expect(screen.getByLabelText('Insert day at position 1')).toBeTruthy();
    expect(screen.getByLabelText('Insert day at position 3')).toBeTruthy();
  });

  test('uses date labels when a start date is selected', async () => {
    const screen = await UITestHelper.renderWithPaper(
      <TripTimeline
        dayEvents={[day({ id: 'day-1', position: 0 }), day({ id: 'day-2', position: 1 })]}
        startDate="2026-06-03"
        onCreateDetailEvent={jest.fn()}
        onInsertDayEvent={jest.fn()}
      />
    );

    expect(screen.getByText('Jun 3')).toBeTruthy();
    expect(screen.getByText('Wed')).toBeTruthy();
    expect(screen.getByText('Jun 4')).toBeTruthy();
    expect(screen.getByText('Thu')).toBeTruthy();
  });

  test('expands a day in place and collapses it from the expanded title', async () => {
    const screen = await UITestHelper.renderWithPaper(
      <TripTimeline
        dayEvents={[day({ id: 'day-1', position: 0 })]}
        startDate={null}
        onCreateDetailEvent={jest.fn()}
        onInsertDayEvent={jest.fn()}
      />
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('timeline-day-row-day-1'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('timeline-day-row-day-1')).toBeNull();
    });
    expect(screen.getByTestId('expanded-day-event-day-1')).toBeTruthy();
    expect(screen.getByText('Day 1')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Day 1'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('timeline-day-row-day-1')).toBeTruthy();
    });
  });

  test('calls insert and detail creation callbacks from timeline controls', async () => {
    const onInsertDayEvent = jest.fn();
    const onCreateDetailEvent = jest.fn();
    const screen = await UITestHelper.renderWithPaper(
      <TripTimeline
        dayEvents={[day({ id: 'day-1', position: 0 })]}
        startDate={null}
        onCreateDetailEvent={onCreateDetailEvent}
        onInsertDayEvent={onInsertDayEvent}
      />
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Insert day at position 1'));
    });
    expect(onInsertDayEvent).toHaveBeenCalledWith(0);

    await act(async () => {
      fireEvent.press(screen.getByTestId('timeline-day-row-day-1'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('hourly-timeline-day-1')).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('hourly-timeline-day-1'), {
        nativeEvent: { locationY: 85 },
      });
    });

    expect(onCreateDetailEvent).toHaveBeenCalledWith({
      dayEventId: 'day-1',
      endMinute: 90,
      startMinute: 30,
    });
  });
});

function day(overrides: Partial<TripDayEventWithDetails> = {}): TripDayEventWithDetails {
  return {
    createdAt: baseDate,
    description: null,
    detailEvents: [],
    id: 'day-1',
    photoUri: null,
    position: 0,
    title: null,
    tripId: 'trip-1',
    updatedAt: baseDate,
    ...overrides,
  };
}
