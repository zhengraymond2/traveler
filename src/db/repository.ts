import { and, asc, desc, eq, isNull, ne, or } from 'drizzle-orm';

import type { AppDatabase } from './client';
import { dedupeLocationRecord } from './dedupe-locations';
import {
  collectionLocations,
  collections,
  type Collection,
  type CollectionKind,
  locationPhotos,
  locations,
  type NewCollection,
  type NewCollectionLocation,
  type Location,
  type LocationPhoto,
  type NewLocation,
  type NewLocationPhoto,
} from './schema';

export type LocationWithPhotos = Location & {
  photos: LocationPhoto[];
};

export type SavedCollectionWithLocations = Collection & {
  locations: LocationWithPhotos[];
};

export type CreateLocationInput = {
  name?: string;
  latitude?: number | null;
  longitude?: number | null;
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

export type CreateCollectionInput = {
  title: string;
  kind?: CollectionKind;
};

export type DuplicateCollectionInput = {
  id: string;
  title: string;
  kind?: CollectionKind;
  sourceCollectionId?: string | null;
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
  listCollections(): Promise<Collection[]>;
  listCollectionsWithLocations(): Promise<SavedCollectionWithLocations[]>;
  listCollectionsForLocation(locationId: string): Promise<Collection[]>;
  getCollection(id: string): Promise<SavedCollectionWithLocations | null>;
}

export interface LocationWriter {
  createLocation(input: CreateLocationInput): Promise<Location>;
  updateLocation(id: string, input: UpdateLocationInput): Promise<Location | null>;
  deleteLocation(id: string): Promise<void>;
  addPhoto(input: AddLocationPhotoInput): Promise<LocationPhoto>;
  removePhoto(id: string): Promise<void>;
  createCollection(input: CreateCollectionInput): Promise<Collection>;
  renameCollection(id: string, title: string): Promise<Collection | null>;
  deleteCollection(id: string): Promise<void>;
  addLocationToCollection(collectionId: string, locationId: string): Promise<void>;
  removeLocationFromCollection(collectionId: string, locationId: string): Promise<void>;
  duplicateCollection(input: DuplicateCollectionInput): Promise<Collection>;
  convertCollectionToShared(id: string, title?: string): Promise<Collection>;
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
  const reader: LocationReader = {
    async listLocations() {
      return database.select().from(locations).orderBy(desc(locations.createdAt));
    },

    async listLocationsWithPhotos() {
      const savedLocations = await reader.listLocations();
      return withPhotos(savedLocations, reader.listPhotosForLocation);
    },

    async listLocationsByCountry(country) {
      return database
        .select()
        .from(locations)
        .where(eq(locations.country, country))
        .orderBy(asc(locations.name), desc(locations.createdAt));
    },

    async listLocationsWithPhotosByCountry(country) {
      const savedLocations = await reader.listLocationsByCountry(country);
      return withPhotos(savedLocations, reader.listPhotosForLocation);
    },

    async listLocationsWithoutCountry() {
      return database
        .select()
        .from(locations)
        .where(or(isNull(locations.country), eq(locations.country, '')))
        .orderBy(asc(locations.name), desc(locations.createdAt));
    },

    async listLocationsWithoutCountryWithPhotos() {
      const savedLocations = await reader.listLocationsWithoutCountry();
      return withPhotos(savedLocations, reader.listPhotosForLocation);
    },

    async getLocation(id) {
      const [location] = await database.select().from(locations).where(eq(locations.id, id)).limit(1);
      if (!location) {
        return null;
      }

      const photos = await reader.listPhotosForLocation(id);
      return { ...location, photos };
    },

    async listPhotosForLocation(locationId) {
      return database
        .select()
        .from(locationPhotos)
        .where(eq(locationPhotos.locationId, locationId))
        .orderBy(asc(locationPhotos.createdAt));
    },

    async listCollections() {
      return database
        .select()
        .from(collections)
        .orderBy(asc(collections.kind), asc(collections.title), asc(collections.createdAt));
    },

    async listCollectionsWithLocations() {
      const savedCollections = await reader.listCollections();
      return withCollectionLocations(savedCollections, reader.getCollection);
    },

    async listCollectionsForLocation(locationId) {
      const memberships = await database
        .select({ collection: collections })
        .from(collectionLocations)
        .innerJoin(collections, eq(collectionLocations.collectionId, collections.id))
        .where(eq(collectionLocations.locationId, locationId))
        .orderBy(asc(collections.kind), asc(collections.title));

      return memberships.map((membership) => membership.collection);
    },

    async getCollection(id) {
      const [collection] = await database.select().from(collections).where(eq(collections.id, id)).limit(1);
      if (!collection) {
        return null;
      }

      const memberships = await database
        .select({ location: locations })
        .from(collectionLocations)
        .innerJoin(locations, eq(collectionLocations.locationId, locations.id))
        .where(eq(collectionLocations.collectionId, id))
        .orderBy(asc(locations.name), desc(locations.createdAt));
      const collectionLocationsWithPhotos = await withPhotos(
        memberships.map((membership) => membership.location),
        reader.listPhotosForLocation
      );

      return { ...collection, locations: collectionLocationsWithPhotos };
    },
  };

  return reader;
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

async function withCollectionLocations(
  savedCollections: Collection[],
  getCollection: (id: string) => Promise<SavedCollectionWithLocations | null>
) {
  const collectionsWithLocations = await Promise.all(
    savedCollections.map(async (collection) => getCollection(collection.id))
  );

  return collectionsWithLocations.filter((collection): collection is SavedCollectionWithLocations =>
    Boolean(collection)
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

    async createCollection(input) {
      const now = new Date();
      const collection: NewCollection = {
        id: createLocalId(),
        title: normalizeCollectionTitle(input.title),
        kind: input.kind ?? 'local',
        sourceCollectionId: null,
        createdAt: now,
        updatedAt: now,
      };

      await database.insert(collections).values(collection);

      const [createdCollection] = await database
        .select()
        .from(collections)
        .where(eq(collections.id, collection.id))
        .limit(1);
      return createdCollection;
    },

    async renameCollection(id, title) {
      await database
        .update(collections)
        .set({
          title: normalizeCollectionTitle(title),
          updatedAt: new Date(),
        })
        .where(eq(collections.id, id));

      const [updatedCollection] = await database.select().from(collections).where(eq(collections.id, id)).limit(1);
      return updatedCollection ?? null;
    },

    async deleteCollection(id) {
      await database.delete(collections).where(eq(collections.id, id));
    },

    async addLocationToCollection(collectionId, locationId) {
      const membership: NewCollectionLocation = {
        collectionId,
        locationId,
        createdAt: new Date(),
      };

      await database.insert(collectionLocations).values(membership).onConflictDoNothing();
      await touchCollection(database, collectionId);
    },

    async removeLocationFromCollection(collectionId, locationId) {
      await database
        .delete(collectionLocations)
        .where(
          and(
            eq(collectionLocations.collectionId, collectionId),
            eq(collectionLocations.locationId, locationId)
          )
        );
      await touchCollection(database, collectionId);
    },

    async duplicateCollection(input) {
      const [sourceCollection] = await database.select().from(collections).where(eq(collections.id, input.id)).limit(1);
      if (!sourceCollection) {
        throw new Error('Collection not found.');
      }

      const now = new Date();
      const duplicatedCollection: NewCollection = {
        id: createLocalId(),
        title: normalizeCollectionTitle(input.title),
        kind: input.kind ?? sourceCollection.kind,
        sourceCollectionId: input.sourceCollectionId ?? sourceCollection.id,
        createdAt: now,
        updatedAt: now,
      };

      await database.insert(collections).values(duplicatedCollection);

      const memberships = await database
        .select()
        .from(collectionLocations)
        .where(eq(collectionLocations.collectionId, sourceCollection.id));
      if (memberships.length) {
        await database.insert(collectionLocations).values(
          memberships.map<NewCollectionLocation>((membership) => ({
            collectionId: duplicatedCollection.id,
            locationId: membership.locationId,
            createdAt: now,
          }))
        );
      }

      const [createdCollection] = await database
        .select()
        .from(collections)
        .where(eq(collections.id, duplicatedCollection.id))
        .limit(1);
      return createdCollection;
    },

    async convertCollectionToShared(id, title) {
      const [sourceCollection] = await database
        .select()
        .from(collections)
        .where(and(eq(collections.id, id), ne(collections.kind, 'shared')))
        .limit(1);
      if (!sourceCollection) {
        throw new Error('Collection not found.');
      }

      return this.duplicateCollection({
        id,
        title: title ?? sourceCollection.title,
        kind: 'shared',
        sourceCollectionId: sourceCollection.id,
      });
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

function normalizeCollectionTitle(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error('Collection name is required.');
  }

  return normalized;
}

async function touchCollection(database: AppDatabase, id: string) {
  await database.update(collections).set({ updatedAt: new Date() }).where(eq(collections.id, id));
}

function createLocalId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
