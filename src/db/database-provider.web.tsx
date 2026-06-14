import * as React from 'react';

import type { LocationRepository } from './repository';

const webRepository: LocationRepository = {
  reader: {
    async listLocations() {
      return [];
    },
    async listLocationsByCountry() {
      return [];
    },
    async getLocation() {
      return null;
    },
    async listPhotosForLocation() {
      return [];
    },
  },
  writer: {
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
  },
};

const DatabaseContext = React.createContext<LocationRepository>(webRepository);

export function DatabaseProvider({ children }: React.PropsWithChildren) {
  return <DatabaseContext.Provider value={webRepository}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  return React.use(DatabaseContext);
}
