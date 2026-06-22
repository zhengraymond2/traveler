import type { LocationRepository, LocationWithPhotos } from '@/db/repository';
import type { Location } from '@/services/contracts';

export interface SavedLocationsReader {
  getLocation(id: string): Promise<LocationWithPhotos | null>;
  listLocationsWithPhotos(): Promise<LocationWithPhotos[]>;
  listLocationsWithPhotosByCountry(country: string): Promise<LocationWithPhotos[]>;
  listLocationsWithoutCountryWithPhotos(): Promise<LocationWithPhotos[]>;
}

export type SavedLocationsLocalCache = SavedLocationsReader & {
  listSavedCanonicalLocationIds(): Promise<string[]>;
  upsertCachedCanonicalLocations(locations: Location[]): Promise<void>;
};

export type CanonicalLocationsClient = {
  getLocationsByIds(ids: string[]): Promise<Location[]>;
};

export function createSyncedSavedLocationsReader({
  canonicalLocationsClient,
  localCache,
}: {
  canonicalLocationsClient: CanonicalLocationsClient;
  localCache: SavedLocationsLocalCache;
}): SavedLocationsReader {
  let refreshPromise: Promise<void> | null = null;

  function scheduleRefresh() {
    refreshPromise ??= refreshCanonicalCache(localCache, canonicalLocationsClient).finally(() => {
      refreshPromise = null;
    });
  }

  return {
    getLocation(id) {
      scheduleRefresh();
      return localCache.getLocation(id);
    },
    listLocationsWithPhotos() {
      scheduleRefresh();
      return localCache.listLocationsWithPhotos();
    },
    listLocationsWithPhotosByCountry(country) {
      scheduleRefresh();
      return localCache.listLocationsWithPhotosByCountry(country);
    },
    listLocationsWithoutCountryWithPhotos() {
      scheduleRefresh();
      return localCache.listLocationsWithoutCountryWithPhotos();
    },
  };
}

export function createRepositorySavedLocationsLocalCache(repository: LocationRepository): SavedLocationsLocalCache {
  return {
    getLocation: (id) => repository.reader.getLocation(id),
    listLocationsWithPhotos: () => repository.reader.listLocationsWithPhotos(),
    listLocationsWithPhotosByCountry: (country) => repository.reader.listLocationsWithPhotosByCountry(country),
    listLocationsWithoutCountryWithPhotos: () => repository.reader.listLocationsWithoutCountryWithPhotos(),
    listSavedCanonicalLocationIds: () => repository.reader.listSavedCanonicalLocationIds(),
    upsertCachedCanonicalLocations: (locations) => repository.writer.upsertCachedCanonicalLocations(locations),
  };
}

export function createEmptySavedLocationsReader(): SavedLocationsReader {
  return {
    getLocation: async () => null,
    listLocationsWithPhotos: async () => [],
    listLocationsWithPhotosByCountry: async () => [],
    listLocationsWithoutCountryWithPhotos: async () => [],
  };
}

async function refreshCanonicalCache(localCache: SavedLocationsLocalCache, canonicalLocationsClient: CanonicalLocationsClient) {
  try {
    const ids = await localCache.listSavedCanonicalLocationIds();
    if (!ids.length) {
      return;
    }

    const locations = await canonicalLocationsClient.getLocationsByIds(ids);
    if (locations.length) {
      await localCache.upsertCachedCanonicalLocations(locations);
    }
  } catch {
    // The local cache is still usable without network/Aurora. A later focus/load
    // can retry the refresh rather than blocking the saved-locations UI.
  }
}
