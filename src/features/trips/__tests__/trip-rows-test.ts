import { getTripRows } from '../trip-rows';
import type { TripWithDays } from '@/db/trips-repository';

const baseDate = new Date('2026-06-22T12:00:00.000Z');

describe('trip rows', () => {
  test('keeps local and shared trip metadata for gallery sections', () => {
    const rows = getTripRows([
      trip({ id: 'local-1', title: 'Kyoto', kind: 'local' }),
      trip({ id: 'shared-1', title: 'Friends', kind: 'shared' }),
    ]);

    expect(rows.map((row) => ({ id: row.id, title: row.title, kind: row.kind }))).toEqual([
      { id: 'local-1', title: 'Kyoto', kind: 'local' },
      { id: 'shared-1', title: 'Friends', kind: 'shared' },
    ]);
  });

  test('uses cover, day, and detail photos as four-image card covers', () => {
    const rows = getTripRows([
      trip({
        coverPhotoUri: 'file:///cover.jpg',
        dayEvents: [
          day({
            photoUri: 'file:///day.jpg',
            detailEvents: [
              detail({ photos: [photo('file:///one.jpg'), photo('file:///two.jpg'), photo('file:///three.jpg')] }),
            ],
          }),
        ],
      }),
    ]);

    expect(rows[0].imageUris).toEqual([
      'file:///cover.jpg',
      'file:///day.jpg',
      'file:///one.jpg',
      'file:///two.jpg',
    ]);
  });
});

function trip(overrides: Partial<TripWithDays> = {}): TripWithDays {
  return {
    coverPhotoUri: null,
    createdAt: baseDate,
    dayEvents: [],
    id: 'trip-1',
    kind: 'local',
    sourceTripId: null,
    startDate: null,
    syncStatus: 'local',
    title: 'Weekend',
    updatedAt: baseDate,
    ...overrides,
  };
}

function day(overrides: Partial<TripWithDays['dayEvents'][number]> = {}): TripWithDays['dayEvents'][number] {
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

function detail(
  overrides: Partial<TripWithDays['dayEvents'][number]['detailEvents'][number]> = {}
): TripWithDays['dayEvents'][number]['detailEvents'][number] {
  return {
    addressText: null,
    category: null,
    createdAt: baseDate,
    dayEventId: 'day-1',
    description: null,
    endMinute: 60,
    googleMapsUrl: null,
    id: 'detail-1',
    locationId: null,
    photos: [],
    startMinute: 0,
    title: null,
    updatedAt: baseDate,
    ...overrides,
  };
}

function photo(uri: string): TripWithDays['dayEvents'][number]['detailEvents'][number]['photos'][number] {
  return {
    caption: null,
    createdAt: baseDate,
    detailEventId: 'detail-1',
    id: uri,
    uri,
  };
}
