import * as React from 'react';

import type { LocationRepository } from './repository';
import type { TripRepository } from './trips-repository';

type DatabaseContextValue = LocationRepository & TripRepository;

const writeError = (): never => {
  throw new Error('Database writes are only configured for native builds.');
};

const webRepository: DatabaseContextValue = {
  reader: {
    async listSavedCanonicalLocationIds() {
      return [];
    },
    async listLocations() {
      return [];
    },
    async listLocationsWithPhotos() {
      return [];
    },
    async listLocationsByCountry() {
      return [];
    },
    async listLocationsWithPhotosByCountry() {
      return [];
    },
    async listLocationsWithoutCountry() {
      return [];
    },
    async listLocationsWithoutCountryWithPhotos() {
      return [];
    },
    async getLocation() {
      return null;
    },
    async listPhotosForLocation() {
      return [];
    },
    async listCollections() {
      return [];
    },
    async listCollectionsWithLocations() {
      return [];
    },
    async listCollectionsForLocation() {
      return [];
    },
    async getCollection() {
      return null;
    },
  },
  writer: {
    async upsertCachedCanonicalLocations() {
      return undefined;
    },
    async createLocation() {
      throw new Error('Database writes are only configured for native builds.');
    },
    async updateLocation() {
      throw new Error('Database writes are only configured for native builds.');
    },
    async deleteLocation() {
      throw new Error('Database writes are only configured for native builds.');
    },
    async addPhoto() {
      throw new Error('Database writes are only configured for native builds.');
    },
    async removePhoto() {
      throw new Error('Database writes are only configured for native builds.');
    },
    async createCollection() {
      throw new Error('Database writes are only configured for native builds.');
    },
    async renameCollection() {
      throw new Error('Database writes are only configured for native builds.');
    },
    async deleteCollection() {
      throw new Error('Database writes are only configured for native builds.');
    },
    async addLocationToCollection() {
      throw new Error('Database writes are only configured for native builds.');
    },
    async removeLocationFromCollection() {
      throw new Error('Database writes are only configured for native builds.');
    },
    async duplicateCollection() {
      throw new Error('Database writes are only configured for native builds.');
    },
    async convertCollectionToShared() {
      throw new Error('Database writes are only configured for native builds.');
    },
  },
  tripsReader: {
    async listTrips() {
      return [];
    },
    async listTripsWithDays() {
      return [];
    },
    async getTrip() {
      return null;
    },
  },
  tripsWriter: {
    addDetailEventPhoto() {
      return writeError();
    },
    createDetailEvent() {
      return writeError();
    },
    createTrip() {
      return writeError();
    },
    deleteTrip() {
      return writeError();
    },
    duplicateTrip() {
      return writeError();
    },
    insertDayEvent() {
      return writeError();
    },
    renameTrip() {
      return writeError();
    },
    updateTripStartDate() {
      return writeError();
    },
  },
};

const DatabaseContext = React.createContext<DatabaseContextValue>(webRepository);

export function DatabaseProvider({ children }: React.PropsWithChildren) {
  return <DatabaseContext.Provider value={webRepository}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  return React.use(DatabaseContext);
}
