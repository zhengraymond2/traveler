import { getDayTimelineLabel, getExpandedDayTitle } from '../trip-date-labels';

describe('trip date labels', () => {
  test('uses one-based day numbers when the trip has no start date', () => {
    expect(getDayTimelineLabel(0, null)).toEqual({ primary: '1', secondary: null });
    expect(getDayTimelineLabel(5, null)).toEqual({ primary: '6', secondary: null });
  });

  test('uses month/day and weekday labels when the trip has a start date', () => {
    expect(getDayTimelineLabel(0, '2026-06-03')).toEqual({ primary: 'Jun 3', secondary: 'Wed' });
    expect(getDayTimelineLabel(3, '2026-06-03')).toEqual({ primary: 'Jun 6', secondary: 'Sat' });
  });

  test('uses custom expanded titles before generated defaults', () => {
    expect(getExpandedDayTitle(2, '2026-06-03', 'Beach recovery')).toBe('Beach recovery');
  });

  test('generates expanded titles from day number or full date', () => {
    expect(getExpandedDayTitle(1, null, null)).toBe('Day 2');
    expect(getExpandedDayTitle(1, '2026-06-03', null)).toBe('June 4 Thursday');
  });
});
