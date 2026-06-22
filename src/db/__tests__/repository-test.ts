import type { AppDatabase } from '../client';
import { createLocationRepository } from '../repository';
import { collectionLocations, collections, localLocations, localLocationSourceLinks, localLocationSourcePhotos, locationPhotos } from '../schema';
import { DbTestHelper } from '@/test/DbTestHelper';

describe('location repository', () => {
  test('lists saved locations from local records with cached canonical metadata', async () => {
    const addedAt = new Date('2026-06-21T12:00:00.000Z');
    const cachedLocation = DbTestHelper.location({
      id: 'location-great-wall',
      name: 'Great Wall of China',
    });
    const localLocation = {
      id: 'local-1',
      canonicalLocationId: 'location-great-wall',
      status: 'matched',
      privateDescription: 'Want to hike here someday.',
      lastPartialLocationId: 'partial-1',
      addedAt,
      updatedAt: addedAt,
    };
    const sourcePhoto = {
      id: 'source-photo-1',
      localLocationId: 'local-1',
      uri: 'file:///private-source.jpg',
      createdAt: addedAt,
    };
    const database = {
      select() {
        return {
          from(table: unknown) {
            if (table === localLocations) {
              return {
                leftJoin: jest.fn().mockReturnValue({
                  orderBy: jest.fn().mockResolvedValue([
                    {
                      localLocation,
                      location: cachedLocation,
                    },
                  ]),
                }),
              };
            }

            if (table === localLocationSourcePhotos) {
              return {
                where: jest.fn().mockReturnValue({
                  orderBy: jest.fn().mockResolvedValue([sourcePhoto]),
                }),
              };
            }

            if (table === locationPhotos) {
              return {
                where: jest.fn().mockReturnValue({
                  orderBy: jest.fn().mockResolvedValue([]),
                }),
              };
            }

            throw new Error(`Unexpected table in test database: ${String(table)}`);
          },
        };
      },
    } as unknown as AppDatabase;

    const repository = createLocationRepository(database);

    await expect(repository.reader.listLocationsWithPhotos()).resolves.toMatchObject([
      {
        id: 'location-great-wall',
        localLocationId: 'local-1',
        localStatus: 'matched',
        name: 'Great Wall of China',
        notes: 'Want to hike here someday.',
        photos: [
          {
            id: 'source-photo-1',
            uri: 'file:///private-source.jpg',
          },
        ],
      },
    ]);
  });

  test('loads collection locations with photos without losing reader method context', async () => {
    const collection = {
      id: 'collection-1',
      title: 'Weekend',
      kind: 'local' as const,
      sourceCollectionId: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const location = DbTestHelper.location({ id: 'location-1', name: 'Pico' });
    const photo = DbTestHelper.locationPhoto({ id: 'photo-1', locationId: 'location-1', uri: 'file:///pico.jpg' });
    const database = {
      select(selection?: unknown) {
        return {
          from(table: unknown) {
            if (table === collections) {
              return {
                orderBy: jest.fn().mockResolvedValue([collection]),
                where: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue([collection]),
                }),
              };
            }

            if (table === collectionLocations) {
              return {
                innerJoin: jest.fn().mockReturnValue({
                  where: jest.fn().mockReturnValue({
                    orderBy: jest.fn().mockResolvedValue([{ location }]),
                  }),
                }),
              };
            }

            if (table === locationPhotos) {
              return {
                where: jest.fn().mockReturnValue({
                  orderBy: jest.fn().mockResolvedValue([photo]),
                }),
              };
            }

            throw new Error(`Unexpected table in test database: ${String(table)}`);
          },
        };
      },
    } as unknown as AppDatabase;

    const repository = createLocationRepository(database);

    await expect(repository.reader.listCollectionsWithLocations()).resolves.toEqual([
      {
        ...collection,
        locations: [{ ...location, photos: [photo] }],
      },
    ]);
  });

  test('caches remote local source records with source evidence', async () => {
    const localLocationInsert = createInsertMock();
    const sourcePhotosInsert = createInsertMock();
    const sourceLinksInsert = createInsertMock();
    const database = {
      insert(table: unknown) {
        if (table === localLocations) {
          return localLocationInsert;
        }
        if (table === localLocationSourcePhotos) {
          return sourcePhotosInsert;
        }
        if (table === localLocationSourceLinks) {
          return sourceLinksInsert;
        }

        throw new Error(`Unexpected insert table in test database: ${String(table)}`);
      },
    } as unknown as AppDatabase;
    const repository = createLocationRepository(database);

    await repository.writer.cacheRemoteLocalLocation({
      addedAt: '2026-06-21T12:00:00.000Z',
      canonicalLocationId: null,
      id: 'local-location-1',
      lastPartialLocationId: 'partial-1',
      privateDescription: 'Try the evening tour.',
      sourceInstagramUrls: ['https://instagram.com/p/source-post'],
      sourceLinks: ['https://maps.example/great-wall', 'https://instagram.com/p/source-post'],
      sourcePhotoUris: ['file:///source.jpg'],
      status: 'processing',
      updatedAt: '2026-06-21T12:01:00.000Z',
    });

    expect(localLocationInsert.values).toHaveBeenCalledWith({
      addedAt: new Date('2026-06-21T12:00:00.000Z'),
      canonicalLocationId: null,
      id: 'local-location-1',
      lastPartialLocationId: 'partial-1',
      privateDescription: 'Try the evening tour.',
      status: 'processing',
      updatedAt: new Date('2026-06-21T12:01:00.000Z'),
    });
    expect(sourcePhotosInsert.values).toHaveBeenCalledWith([
      {
        createdAt: new Date('2026-06-21T12:00:00.000Z'),
        id: 'local-location-1-source-photo-0',
        localLocationId: 'local-location-1',
        uri: 'file:///source.jpg',
      },
    ]);
    expect(sourceLinksInsert.values).toHaveBeenCalledWith([
      {
        createdAt: new Date('2026-06-21T12:00:00.000Z'),
        id: 'local-location-1-source-link-0',
        kind: 'link',
        localLocationId: 'local-location-1',
        url: 'https://maps.example/great-wall',
      },
      {
        createdAt: new Date('2026-06-21T12:00:00.000Z'),
        id: 'local-location-1-source-link-1',
        kind: 'instagram',
        localLocationId: 'local-location-1',
        url: 'https://instagram.com/p/source-post',
      },
    ]);
  });
});

function createInsertMock() {
  const chain = {
    values: jest.fn(),
    onConflictDoUpdate: jest.fn(),
  };
  chain.values.mockReturnValue(chain);
  chain.onConflictDoUpdate.mockResolvedValue(undefined);
  return chain;
}
