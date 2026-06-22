import { formatMinuteOfDay, snapMinuteToHalfHour } from '../trip-time';

describe('trip time helpers', () => {
  test('formats minutes after midnight as padded 24-hour time', () => {
    expect(formatMinuteOfDay(0)).toBe('00:00');
    expect(formatMinuteOfDay(9 * 60 + 5)).toBe('09:05');
    expect(formatMinuteOfDay(23 * 60 + 59)).toBe('23:59');
  });

  test('clamps formatted minutes to a single day', () => {
    expect(formatMinuteOfDay(-30)).toBe('00:00');
    expect(formatMinuteOfDay(26 * 60)).toBe('23:59');
  });

  test('snaps vertical taps to half-hour buckets', () => {
    expect(snapMinuteToHalfHour(0, 2400)).toBe(0);
    expect(snapMinuteToHalfHour(51, 2400)).toBe(30);
    expect(snapMinuteToHalfHour(101, 2400)).toBe(60);
    expect(snapMinuteToHalfHour(2399, 2400)).toBe(23 * 60 + 30);
  });
});
