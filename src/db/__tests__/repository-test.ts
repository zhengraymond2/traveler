import type { AppDatabase } from '../client';
import { createLocationRepository } from '../repository';
import { collectionLocations, collections, locationPhotos } from '../schema';
import { DbTestHelper } from '@/test/DbTestHelper';

describe('location repository', () => {
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
});
