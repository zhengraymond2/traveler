import type { AppDatabase } from '../client';
import { createTripRepository } from '../trips-repository';
import {
  tripDayEvents,
  tripDetailEventPhotos,
  tripDetailEvents,
  trips,
  type Trip,
  type TripDayEvent,
  type TripDetailEvent,
  type TripDetailEventPhoto,
} from '../schema';

const baseDate = new Date('2026-06-22T12:00:00.000Z');

describe('trips repository', () => {
  test('creates local and shared trips with normalized titles', async () => {
    const insertedRows: unknown[] = [];
    const createdTrip = trip({ id: 'trip-created', title: 'Kyoto', kind: 'shared' });
    const database = {
      insert(table: unknown) {
        expect(table).toBe(trips);
        return {
          values(row: unknown) {
            insertedRows.push(row);
            return Promise.resolve();
          },
        };
      },
      select() {
        return {
          from(table: unknown) {
            expect(table).toBe(trips);
            return {
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([createdTrip]),
              }),
            };
          },
        };
      },
    } as unknown as AppDatabase;

    const repository = createTripRepository(database);

    await expect(repository.tripsWriter.createTrip({ title: '  Kyoto  ', kind: 'shared' })).resolves.toEqual(createdTrip);
    expect(insertedRows).toMatchObject([
      {
        title: 'Kyoto',
        kind: 'shared',
        startDate: null,
        sourceTripId: null,
        syncStatus: 'local',
      },
    ]);
  });

  test('inserts a day event and shifts existing positions at the insertion point', async () => {
    const shiftedTables: unknown[] = [];
    const insertedRows: unknown[] = [];
    const createdDay = dayEvent({ id: 'day-new', tripId: 'trip-1', position: 1, title: null });
    const database = {
      update(table: unknown) {
        shiftedTables.push(table);
        return {
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(undefined),
          }),
        };
      },
      insert(table: unknown) {
        expect(table).toBe(tripDayEvents);
        return {
          values(row: unknown) {
            insertedRows.push(row);
            return Promise.resolve();
          },
        };
      },
      select() {
        return {
          from(table: unknown) {
            expect(table).toBe(tripDayEvents);
            return {
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([createdDay]),
              }),
            };
          },
        };
      },
    } as unknown as AppDatabase;

    const repository = createTripRepository(database);

    await expect(repository.tripsWriter.insertDayEvent({ tripId: 'trip-1', index: 1 })).resolves.toEqual(createdDay);
    expect(shiftedTables).toEqual([tripDayEvents]);
    expect(insertedRows).toMatchObject([
      {
        tripId: 'trip-1',
        position: 1,
        title: null,
        description: null,
        photoUri: null,
      },
    ]);
  });

  test('loads a trip with ordered day events, detail events, and photos', async () => {
    const savedTrip = trip({ id: 'trip-1', title: 'Azores' });
    const firstDay = dayEvent({ id: 'day-1', tripId: 'trip-1', position: 0 });
    const breakfast = detailEvent({
      id: 'detail-1',
      dayEventId: 'day-1',
      title: 'Breakfast',
      startMinute: 9 * 60,
      endMinute: 10 * 60,
    });
    const photo = detailPhoto({ id: 'detail-photo-1', detailEventId: 'detail-1' });
    const database = {
      select() {
        return {
          from(table: unknown) {
            if (table === trips) {
              return {
                where: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue([savedTrip]),
                }),
              };
            }

            if (table === tripDayEvents) {
              return {
                where: jest.fn().mockReturnValue({
                  orderBy: jest.fn().mockResolvedValue([firstDay]),
                }),
              };
            }

            if (table === tripDetailEvents) {
              return {
                where: jest.fn().mockReturnValue({
                  orderBy: jest.fn().mockResolvedValue([breakfast]),
                }),
              };
            }

            if (table === tripDetailEventPhotos) {
              return {
                where: jest.fn().mockReturnValue({
                  orderBy: jest.fn().mockResolvedValue([photo]),
                }),
              };
            }

            throw new Error(`Unexpected table: ${String(table)}`);
          },
        };
      },
    } as unknown as AppDatabase;

    const repository = createTripRepository(database);

    await expect(repository.tripsReader.getTrip('trip-1')).resolves.toEqual({
      ...savedTrip,
      dayEvents: [
        {
          ...firstDay,
          detailEvents: [
            {
              ...breakfast,
              photos: [photo],
            },
          ],
        },
      ],
    });
  });
});

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    coverPhotoUri: null,
    createdAt: baseDate,
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

function dayEvent(overrides: Partial<TripDayEvent> = {}): TripDayEvent {
  return {
    createdAt: baseDate,
    description: null,
    id: 'day-1',
    photoUri: null,
    position: 0,
    title: null,
    tripId: 'trip-1',
    updatedAt: baseDate,
    ...overrides,
  };
}

function detailEvent(overrides: Partial<TripDetailEvent> = {}): TripDetailEvent {
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
    startMinute: 0,
    title: null,
    updatedAt: baseDate,
    ...overrides,
  };
}

function detailPhoto(overrides: Partial<TripDetailEventPhoto> = {}): TripDetailEventPhoto {
  return {
    caption: null,
    createdAt: baseDate,
    detailEventId: 'detail-1',
    id: 'detail-photo-1',
    uri: 'file:///detail.jpg',
    ...overrides,
  };
}
