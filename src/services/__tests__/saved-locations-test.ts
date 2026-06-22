import type { Location } from '@/services/contracts';
import { DbTestHelper } from '@/test/DbTestHelper';

import { createSyncedSavedLocationsReader } from '../saved-locations';

describe('synced saved locations reader', () => {
  test('returns cached local saved locations immediately and refreshes canonical metadata in the background', async () => {
    const cachedLocation = DbTestHelper.locationWithPhotos({
      id: 'location-great-wall',
      name: 'Old Great Wall Name',
    });
    const refreshedLocation: Location = {
      allTrailsUrl: null,
      createdAt: '2026-06-21T12:00:00.000Z',
      fieldConfidenceJson: '{"name":1}',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Great%20Wall%20of%20China',
      id: 'location-great-wall',
      instagramFeedUrl: 'https://www.instagram.com/explore/locations/236834088/great-wall-of-china/',
      latitude: 40.4319,
      longitude: 116.5704,
      name: 'Great Wall of China',
      updatedAt: '2026-06-21T12:00:00.000Z',
    };
    const upserted: Location[] = [];
    const reader = createSyncedSavedLocationsReader({
      canonicalLocationsClient: {
        getLocationsByIds: jest.fn(async () => [refreshedLocation]),
      },
      localCache: {
        getLocation: jest.fn(),
        listLocationsWithPhotos: jest.fn(async () => [cachedLocation]),
        listLocationsWithPhotosByCountry: jest.fn(),
        listLocationsWithoutCountryWithPhotos: jest.fn(),
        listSavedCanonicalLocationIds: jest.fn(async () => ['location-great-wall']),
        upsertCachedCanonicalLocations: jest.fn(async (locations) => {
          upserted.push(...locations);
        }),
      },
    });

    await expect(reader.listLocationsWithPhotos()).resolves.toEqual([cachedLocation]);
    await flushPromises();

    expect(upserted).toEqual([refreshedLocation]);
  });
});

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}
