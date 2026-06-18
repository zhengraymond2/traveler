import { asc, desc, eq, isNull, or } from 'drizzle-orm';

import type { AppDatabase } from './client';
import { dedupeLocationRecord } from './dedupe-locations';
import {
  locationPhotos,
  locations,
  type Location,
  type LocationPhoto,
  type NewLocation,
  type NewLocationPhoto,
} from './schema';

export type LocationWithPhotos = Location & {
  photos: LocationPhoto[];
};

export type CreateLocationInput = {
  name?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  instagramUrl?: string;
  trailMapUrl?: string;
  notes?: string;
  country?: string;
  category?: string;
  photos?: {
    uri: string;
    caption?: string;
  }[];
};

export type UpdateLocationInput = Partial<Omit<CreateLocationInput, 'photos'>>;

export type AddLocationPhotoInput = {
  locationId: string;
  uri: string;
  caption?: string;
};

export interface LocationReader {
  listLocations(): Promise<Location[]>;
  listLocationsWithPhotos(): Promise<LocationWithPhotos[]>;
  listLocationsByCountry(country: string): Promise<Location[]>;
  listLocationsWithPhotosByCountry(country: string): Promise<LocationWithPhotos[]>;
  listLocationsWithoutCountry(): Promise<Location[]>;
  listLocationsWithoutCountryWithPhotos(): Promise<LocationWithPhotos[]>;
  getLocation(id: string): Promise<LocationWithPhotos | null>;
  listPhotosForLocation(locationId: string): Promise<LocationPhoto[]>;
}

export interface LocationWriter {
  createLocation(input: CreateLocationInput): Promise<Location>;
  updateLocation(id: string, input: UpdateLocationInput): Promise<Location | null>;
  deleteLocation(id: string): Promise<void>;
  addPhoto(input: AddLocationPhotoInput): Promise<LocationPhoto>;
  removePhoto(id: string): Promise<void>;
}

export type LocationRepository = {
  reader: LocationReader;
  writer: LocationWriter;
};

export function createLocationRepository(database: AppDatabase): LocationRepository {
  return {
    reader: createLocationReader(database),
    writer: createLocationWriter(database),
  };
}

function createLocationReader(database: AppDatabase): LocationReader {
  return {
    async listLocations() {
      return database.select().from(locations).orderBy(desc(locations.createdAt));
    },

    async listLocationsWithPhotos() {
      const savedLocations = await this.listLocations();
      return withPhotos(savedLocations, this.listPhotosForLocation);
    },

    async listLocationsByCountry(country) {
      return database
        .select()
        .from(locations)
        .where(eq(locations.country, country))
        .orderBy(asc(locations.name), desc(locations.createdAt));
    },

    async listLocationsWithPhotosByCountry(country) {
      const savedLocations = await this.listLocationsByCountry(country);
      return withPhotos(savedLocations, this.listPhotosForLocation);
    },

    async listLocationsWithoutCountry() {
      return database
        .select()
        .from(locations)
        .where(or(isNull(locations.country), eq(locations.country, '')))
        .orderBy(asc(locations.name), desc(locations.createdAt));
    },

    async listLocationsWithoutCountryWithPhotos() {
      const savedLocations = await this.listLocationsWithoutCountry();
      return withPhotos(savedLocations, this.listPhotosForLocation);
    },

    async getLocation(id) {
      const [location] = await database.select().from(locations).where(eq(locations.id, id)).limit(1);
      if (!location) {
        return null;
      }

      const photos = await this.listPhotosForLocation(id);
      return { ...location, photos };
    },

    async listPhotosForLocation(locationId) {
      return database
        .select()
        .from(locationPhotos)
        .where(eq(locationPhotos.locationId, locationId))
        .orderBy(asc(locationPhotos.createdAt));
    },
  };
}

async function withPhotos(
  savedLocations: Location[],
  listPhotosForLocation: (locationId: string) => Promise<LocationPhoto[]>
) {
  return Promise.all(
    savedLocations.map(async (location) => ({
      ...location,
      photos: await listPhotosForLocation(location.id),
    }))
  );
}

function createLocationWriter(database: AppDatabase): LocationWriter {
  return {
    async createLocation(input) {
      const now = new Date();
      const location: NewLocation = {
        id: createLocalId(),
        name: normalizeText(input.name),
        latitude: input.latitude,
        longitude: input.longitude,
        googleMapsUrl: normalizeText(input.googleMapsUrl),
        instagramUrl: normalizeText(input.instagramUrl),
        trailMapUrl: normalizeText(input.trailMapUrl),
        notes: normalizeText(input.notes),
        country: normalizeText(input.country),
        category: normalizeText(input.category),
        createdAt: now,
        updatedAt: now,
      };

      await database.insert(locations).values(location);

      if (input.photos?.length) {
        const photos = input.photos.map<NewLocationPhoto>((photo) => ({
          id: createLocalId(),
          locationId: location.id,
          uri: photo.uri,
          caption: normalizeText(photo.caption),
          createdAt: now,
        }));
        await database.insert(locationPhotos).values(photos);
      }

      const [createdLocation] = await database
        .select()
        .from(locations)
        .where(eq(locations.id, location.id))
        .limit(1);

      return dedupeLocationRecord(database, createdLocation);
    },

    async updateLocation(id, input) {
      const [existing] = await database.select().from(locations).where(eq(locations.id, id)).limit(1);
      if (!existing) {
        return null;
      }

      await database
        .update(locations)
        .set({
          ...normalizeLocationUpdate(input),
          updatedAt: new Date(),
        })
        .where(eq(locations.id, id));

      const [updatedLocation] = await database.select().from(locations).where(eq(locations.id, id)).limit(1);
      return updatedLocation;
    },

    async deleteLocation(id) {
      await database.delete(locations).where(eq(locations.id, id));
    },

    async addPhoto(input) {
      const photo: NewLocationPhoto = {
        id: createLocalId(),
        locationId: input.locationId,
        uri: input.uri,
        caption: normalizeText(input.caption),
        createdAt: new Date(),
      };

      await database.insert(locationPhotos).values(photo);

      const [createdPhoto] = await database
        .select()
        .from(locationPhotos)
        .where(eq(locationPhotos.id, photo.id))
        .limit(1);

      return createdPhoto;
    },

    async removePhoto(id) {
      await database.delete(locationPhotos).where(eq(locationPhotos.id, id));
    },
  };
}

function normalizeLocationUpdate(input: UpdateLocationInput) {
  const update: Partial<NewLocation> = {};

  if ('name' in input) {
    update.name = normalizeText(input.name);
  }
  if ('latitude' in input) {
    update.latitude = input.latitude;
  }
  if ('longitude' in input) {
    update.longitude = input.longitude;
  }
  if ('googleMapsUrl' in input) {
    update.googleMapsUrl = normalizeText(input.googleMapsUrl);
  }
  if ('instagramUrl' in input) {
    update.instagramUrl = normalizeText(input.instagramUrl);
  }
  if ('trailMapUrl' in input) {
    update.trailMapUrl = normalizeText(input.trailMapUrl);
  }
  if ('notes' in input) {
    update.notes = normalizeText(input.notes);
  }
  if ('country' in input) {
    update.country = normalizeText(input.country);
  }
  if ('category' in input) {
    update.category = normalizeText(input.category);
  }

  return update;
}

function normalizeText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function createLocalId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
