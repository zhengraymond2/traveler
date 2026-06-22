import { and, asc, desc, eq, ne } from 'drizzle-orm';

import type { AppDatabase } from './client';
import { dedupeLocationRecord } from './dedupe-locations';
import {
  collectionLocations,
  collections,
  type Collection,
  type CollectionKind,
  localLocations,
  type LocalLocation,
  localLocationSourcePhotos,
  localLocationSourceLinks,
  type LocalLocationSourcePhoto,
  type NewLocalLocation,
  type NewLocalLocationSourcePhoto,
  type NewLocalLocationSourceLink,
  locationPhotos,
  locations,
  type NewCollection,
  type NewCollectionLocation,
  type Location,
  type LocationPhoto,
  type NewLocation,
  type NewLocationPhoto,
} from './schema';
import type { LocalLocation as RemoteLocalLocation, Location as CanonicalLocation } from '@/services/contracts';

export type LocationWithPhotos = Location & {
  addedAt?: Date | null;
  localLocationId?: string | null;
  localStatus?: string | null;
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
  listSavedCanonicalLocationIds(): Promise<string[]>;
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
  upsertCachedCanonicalLocations(input: CanonicalLocation[]): Promise<void>;
  cacheRemoteLocalLocation(input: RemoteLocalLocation): Promise<void>;
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
    async listSavedCanonicalLocationIds() {
      const rows = await database.select({ canonicalLocationId: localLocations.canonicalLocationId }).from(localLocations);
      return Array.from(
        new Set(
          rows
            .map((row) => row.canonicalLocationId)
            .filter((id): id is string => Boolean(id))
        )
      );
    },

    async listLocations() {
      return (await reader.listLocationsWithPhotos()).map(({ photos: _photos, ...location }) => location);
    },

    async listLocationsWithPhotos() {
      return listLocalSavedLocationsWithPhotos(database, reader.listPhotosForLocation);
    },

    async listLocationsByCountry(country) {
      return (await reader.listLocationsWithPhotosByCountry(country)).map(({ photos: _photos, ...location }) => location);
    },

    async listLocationsWithPhotosByCountry(country) {
      return (await reader.listLocationsWithPhotos()).filter((location) => location.country === country);
    },

    async listLocationsWithoutCountry() {
      return (await reader.listLocationsWithoutCountryWithPhotos()).map(({ photos: _photos, ...location }) => location);
    },

    async listLocationsWithoutCountryWithPhotos() {
      return (await reader.listLocationsWithPhotos()).filter((location) => !location.country);
    },

    async getLocation(id) {
      return (
        (await reader.listLocationsWithPhotos()).find(
          (location) => location.id === id || location.localLocationId === id
        ) ?? null
      );
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
    async upsertCachedCanonicalLocations(input) {
      if (!input.length) {
        return;
      }

      const rows = input.map<NewLocation>((location) => ({
        category: null,
        country: null,
        createdAt: toDate(location.createdAt),
        fieldConfidenceJson: location.fieldConfidenceJson,
        googleMapsUrl: location.googleMapsUrl,
        id: location.id,
        instagramFeedUrl: location.instagramFeedUrl,
        instagramUrl: null,
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name,
        notes: null,
        trailMapUrl: location.allTrailsUrl,
        updatedAt: toDate(location.updatedAt),
      }));

      for (const row of rows) {
        await database
          .insert(locations)
          .values(row)
          .onConflictDoUpdate({
            target: locations.id,
            set: {
              fieldConfidenceJson: row.fieldConfidenceJson,
              googleMapsUrl: row.googleMapsUrl,
              instagramFeedUrl: row.instagramFeedUrl,
              latitude: row.latitude,
              longitude: row.longitude,
              name: row.name,
              trailMapUrl: row.trailMapUrl,
              updatedAt: row.updatedAt,
            },
          });
      }
    },

    async cacheRemoteLocalLocation(input) {
      const addedAt = toDate(input.addedAt);
      const updatedAt = toDate(input.updatedAt);
      const row: NewLocalLocation = {
        addedAt,
        canonicalLocationId: input.canonicalLocationId,
        id: input.id,
        lastPartialLocationId: input.lastPartialLocationId,
        privateDescription: input.privateDescription,
        status: input.status,
        updatedAt,
      };

      await database
        .insert(localLocations)
        .values(row)
        .onConflictDoUpdate({
          target: localLocations.id,
          set: {
            canonicalLocationId: row.canonicalLocationId,
            lastPartialLocationId: row.lastPartialLocationId,
            privateDescription: row.privateDescription,
            status: row.status,
            updatedAt: row.updatedAt,
          },
        });

      await database.delete(localLocationSourcePhotos).where(eq(localLocationSourcePhotos.localLocationId, input.id));
      await database.delete(localLocationSourceLinks).where(eq(localLocationSourceLinks.localLocationId, input.id));

      if (input.sourcePhotoUris.length) {
        await database.insert(localLocationSourcePhotos).values(
          input.sourcePhotoUris.map<NewLocalLocationSourcePhoto>((uri, index) => ({
            createdAt: addedAt,
            id: `${input.id}-source-photo-${index}`,
            localLocationId: input.id,
            uri,
          }))
        );
      }

      if (input.sourceLinks.length) {
        await database.insert(localLocationSourceLinks).values(
          input.sourceLinks.map<NewLocalLocationSourceLink>((url, index) => ({
            createdAt: addedAt,
            id: `${input.id}-source-link-${index}`,
            kind: input.sourceInstagramUrls.includes(url) ? 'instagram' : 'link',
            localLocationId: input.id,
            url,
          }))
        );
      }
    },

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

      const localLocation: NewLocalLocation = {
        addedAt: now,
        canonicalLocationId: location.id,
        id: createLocalId(),
        lastPartialLocationId: null,
        privateDescription: normalizeText(input.notes),
        status: 'matched',
        updatedAt: now,
      };
      await database.insert(localLocations).values(localLocation);

      if (input.photos?.length) {
        const photos = input.photos.map<NewLocationPhoto>((photo) => ({
          id: createLocalId(),
          locationId: location.id,
          uri: photo.uri,
          caption: normalizeText(photo.caption),
          createdAt: now,
        }));
        await database.insert(locationPhotos).values(photos);
        await database.insert(localLocationSourcePhotos).values(
          input.photos.map<NewLocalLocationSourcePhoto>((photo) => ({
            createdAt: now,
            id: createLocalId(),
            localLocationId: localLocation.id,
            uri: photo.uri,
          }))
        );
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

async function listLocalSavedLocationsWithPhotos(
  database: AppDatabase,
  listPhotosForLocation: (locationId: string) => Promise<LocationPhoto[]>
): Promise<LocationWithPhotos[]> {
  const rows = await database
    .select({ localLocation: localLocations, location: locations })
    .from(localLocations)
    .leftJoin(locations, eq(localLocations.canonicalLocationId, locations.id))
    .orderBy(desc(localLocations.addedAt));

  return Promise.all(
    rows.map(async ({ localLocation, location }) =>
      toLocationWithPhotos(
        localLocation,
        location,
        await listLocalSourcePhotos(database, localLocation.id, location?.id ?? localLocation.canonicalLocationId ?? localLocation.id),
        location ? await listPhotosForLocation(location.id) : []
      )
    )
  );
}

async function listLocalSourcePhotos(database: AppDatabase, localLocationId: string, locationId: string): Promise<LocationPhoto[]> {
  const sourcePhotos = await database
    .select()
    .from(localLocationSourcePhotos)
    .where(eq(localLocationSourcePhotos.localLocationId, localLocationId))
    .orderBy(asc(localLocationSourcePhotos.createdAt));

  return sourcePhotos.map((photo) => toLocationPhoto(photo, locationId));
}

function toLocationWithPhotos(
  localLocation: LocalLocation,
  location: Location | null,
  sourcePhotos: LocationPhoto[],
  legacyPhotos: LocationPhoto[]
): LocationWithPhotos {
  const id = location?.id ?? localLocation.canonicalLocationId ?? localLocation.id;
  const now = new Date(0);

  return {
    id,
    name: location?.name ?? null,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    googleMapsUrl: location?.googleMapsUrl ?? null,
    instagramUrl: location?.instagramUrl ?? null,
    instagramFeedUrl: location?.instagramFeedUrl ?? null,
    trailMapUrl: location?.trailMapUrl ?? null,
    fieldConfidenceJson: location?.fieldConfidenceJson ?? null,
    notes: localLocation.privateDescription ?? location?.notes ?? null,
    country: location?.country ?? null,
    category: location?.category ?? null,
    createdAt: location?.createdAt ?? localLocation.addedAt ?? now,
    updatedAt: location?.updatedAt ?? localLocation.updatedAt ?? now,
    addedAt: localLocation.addedAt,
    localLocationId: localLocation.id,
    localStatus: localLocation.status,
    photos: sourcePhotos.length ? sourcePhotos : legacyPhotos,
  };
}

function toLocationPhoto(photo: LocalLocationSourcePhoto, locationId: string): LocationPhoto {
  return {
    caption: null,
    createdAt: photo.createdAt,
    id: photo.id,
    locationId,
    uri: photo.uri,
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

function toDate(value: string) {
  return new Date(value);
}

async function touchCollection(database: AppDatabase, id: string) {
  await database.update(collections).set({ updatedAt: new Date() }).where(eq(collections.id, id));
}

function createLocalId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
