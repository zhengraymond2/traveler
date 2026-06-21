import { getRecentlyAddedLocations, isProcessingLocation } from '../recently-added';
import { DbTestHelper } from '@/test/DbTestHelper';

describe('recently added locations', () => {
  test('returns locations added in the last hour newest first', () => {
    const now = new Date('2026-06-21T12:00:00.000Z');
    const recent = DbTestHelper.locationWithPhotos({
      id: 'recent',
      createdAt: new Date('2026-06-21T11:55:00.000Z'),
    });
    const newer = DbTestHelper.locationWithPhotos({
      id: 'newer',
      createdAt: new Date('2026-06-21T11:59:00.000Z'),
    });
    const old = DbTestHelper.locationWithPhotos({
      id: 'old',
      createdAt: new Date('2026-06-21T10:30:00.000Z'),
    });

    expect(getRecentlyAddedLocations(now, [recent, old, newer]).map((location) => location.id)).toEqual([
      'newer',
      'recent',
    ]);
  });

  test('detects processing records when local status is present', () => {
    expect(isProcessingLocation({ localStatus: 'processing' })).toBe(true);
    expect(isProcessingLocation({ status: 'processing' })).toBe(true);
    expect(isProcessingLocation({ localStatus: 'matched' })).toBe(false);
  });
});
