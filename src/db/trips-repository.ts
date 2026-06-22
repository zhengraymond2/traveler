import { and, asc, eq, gte, sql } from 'drizzle-orm';

import type { AppDatabase } from './client';
import {
  type NewTrip,
  type NewTripDayEvent,
  type NewTripDetailEvent,
  type NewTripDetailEventPhoto,
  type Trip,
  type TripDayEvent,
  type TripDetailEvent,
  type TripDetailEventPhoto,
  type TripKind,
  tripDayEvents,
  tripDetailEventPhotos,
  tripDetailEvents,
  trips,
} from './schema';

export type TripDetailEventWithPhotos = TripDetailEvent & {
  photos: TripDetailEventPhoto[];
};

export type TripDayEventWithDetails = TripDayEvent & {
  detailEvents: TripDetailEventWithPhotos[];
};

export type TripWithDays = Trip & {
  dayEvents: TripDayEventWithDetails[];
};

export type CreateTripInput = {
  kind?: TripKind;
  startDate?: Date | string | null;
  title: string;
};

export type InsertTripDayEventInput = {
  description?: string | null;
  index?: number;
  photoUri?: string | null;
  title?: string | null;
  tripId: string;
};

export type UpdateTripDayEventInput = Partial<Pick<InsertTripDayEventInput, 'description' | 'photoUri' | 'title'>>;

export type CreateTripDetailEventInput = {
  addressText?: string | null;
  category?: string | null;
  dayEventId: string;
  description?: string | null;
  endMinute: number;
  googleMapsUrl?: string | null;
  locationId?: string | null;
  startMinute: number;
  title?: string | null;
};

export type AddTripDetailEventPhotoInput = {
  caption?: string | null;
  detailEventId: string;
  uri: string;
};

export interface TripReader {
  getTrip(id: string): Promise<TripWithDays | null>;
  listTrips(): Promise<Trip[]>;
  listTripsWithDays(): Promise<TripWithDays[]>;
}

export interface TripWriter {
  addDetailEventPhoto(input: AddTripDetailEventPhotoInput): Promise<TripDetailEventPhoto>;
  createDetailEvent(input: CreateTripDetailEventInput): Promise<TripDetailEvent>;
  createTrip(input: CreateTripInput): Promise<Trip>;
  deleteTrip(id: string): Promise<void>;
  insertDayEvent(input: InsertTripDayEventInput): Promise<TripDayEvent>;
  renameTrip(id: string, title: string): Promise<Trip | null>;
  updateTripStartDate(id: string, startDate: Date | string | null): Promise<Trip | null>;
}

export type TripRepository = {
  tripsReader: TripReader;
  tripsWriter: TripWriter;
};

export function createTripRepository(database: AppDatabase): TripRepository {
  return {
    tripsReader: createTripReader(database),
    tripsWriter: createTripWriter(database),
  };
}

function createTripReader(database: AppDatabase): TripReader {
  const reader: TripReader = {
    async listTrips() {
      return database.select().from(trips).orderBy(asc(trips.kind), asc(trips.title), asc(trips.createdAt));
    },

    async listTripsWithDays() {
      const savedTrips = await reader.listTrips();
      return Promise.all(savedTrips.map((trip) => loadTripWithDays(database, trip)));
    },

    async getTrip(id) {
      const [trip] = await database.select().from(trips).where(eq(trips.id, id)).limit(1);
      if (!trip) {
        return null;
      }

      return loadTripWithDays(database, trip);
    },
  };

  return reader;
}

function createTripWriter(database: AppDatabase): TripWriter {
  return {
    async createTrip(input) {
      const now = new Date();
      const trip: NewTrip = {
        coverPhotoUri: null,
        createdAt: now,
        id: createLocalId(),
        kind: input.kind ?? 'local',
        sourceTripId: null,
        startDate: normalizeDate(input.startDate),
        syncStatus: 'local',
        title: normalizeRequiredText(input.title, 'Trip name is required.'),
        updatedAt: now,
      };

      await database.insert(trips).values(trip);
      return selectTrip(database, trip.id);
    },

    async renameTrip(id, title) {
      await database
        .update(trips)
        .set({
          title: normalizeRequiredText(title, 'Trip name is required.'),
          updatedAt: new Date(),
        })
        .where(eq(trips.id, id));

      return selectTripOrNull(database, id);
    },

    async updateTripStartDate(id, startDate) {
      await database
        .update(trips)
        .set({
          startDate: normalizeDate(startDate),
          updatedAt: new Date(),
        })
        .where(eq(trips.id, id));

      return selectTripOrNull(database, id);
    },

    async deleteTrip(id) {
      await database.delete(trips).where(eq(trips.id, id));
    },

    async insertDayEvent(input) {
      const position = Math.max(0, input.index ?? 0);
      const now = new Date();
      const dayEvent: NewTripDayEvent = {
        createdAt: now,
        description: normalizeText(input.description),
        id: createLocalId(),
        photoUri: normalizeText(input.photoUri),
        position,
        title: normalizeText(input.title),
        tripId: input.tripId,
        updatedAt: now,
      };

      await database
        .update(tripDayEvents)
        .set({ position: sql`${tripDayEvents.position} + 1`, updatedAt: now })
        .where(and(eq(tripDayEvents.tripId, input.tripId), gte(tripDayEvents.position, position)));
      await database.insert(tripDayEvents).values(dayEvent);
      return selectDayEvent(database, dayEvent.id);
    },

    async createDetailEvent(input) {
      const now = new Date();
      const detailEvent: NewTripDetailEvent = {
        addressText: normalizeText(input.addressText),
        category: normalizeText(input.category),
        createdAt: now,
        dayEventId: input.dayEventId,
        description: normalizeText(input.description),
        endMinute: input.endMinute,
        googleMapsUrl: normalizeText(input.googleMapsUrl),
        id: createLocalId(),
        locationId: normalizeText(input.locationId),
        startMinute: input.startMinute,
        title: normalizeText(input.title),
        updatedAt: now,
      };

      await database.insert(tripDetailEvents).values(detailEvent);
      return selectDetailEvent(database, detailEvent.id);
    },

    async addDetailEventPhoto(input) {
      const photo: NewTripDetailEventPhoto = {
        caption: normalizeText(input.caption),
        createdAt: new Date(),
        detailEventId: input.detailEventId,
        id: createLocalId(),
        uri: input.uri,
      };

      await database.insert(tripDetailEventPhotos).values(photo);
      return selectDetailEventPhoto(database, photo.id);
    },
  };
}

async function loadTripWithDays(database: AppDatabase, trip: Trip): Promise<TripWithDays> {
  const dayEvents = await database
    .select()
    .from(tripDayEvents)
    .where(eq(tripDayEvents.tripId, trip.id))
    .orderBy(asc(tripDayEvents.position), asc(tripDayEvents.createdAt));

  return {
    ...trip,
    dayEvents: await Promise.all(dayEvents.map((dayEvent) => loadDayEventWithDetails(database, dayEvent))),
  };
}

async function loadDayEventWithDetails(
  database: AppDatabase,
  dayEvent: TripDayEvent
): Promise<TripDayEventWithDetails> {
  const detailEvents = await database
    .select()
    .from(tripDetailEvents)
    .where(eq(tripDetailEvents.dayEventId, dayEvent.id))
    .orderBy(asc(tripDetailEvents.startMinute), asc(tripDetailEvents.createdAt));

  return {
    ...dayEvent,
    detailEvents: await Promise.all(detailEvents.map((detailEvent) => loadDetailEventWithPhotos(database, detailEvent))),
  };
}

async function loadDetailEventWithPhotos(
  database: AppDatabase,
  detailEvent: TripDetailEvent
): Promise<TripDetailEventWithPhotos> {
  return {
    ...detailEvent,
    photos: await database
      .select()
      .from(tripDetailEventPhotos)
      .where(eq(tripDetailEventPhotos.detailEventId, detailEvent.id))
      .orderBy(asc(tripDetailEventPhotos.createdAt)),
  };
}

async function selectTrip(database: AppDatabase, id: string) {
  const trip = await selectTripOrNull(database, id);
  if (!trip) {
    throw new Error('Trip was not created.');
  }

  return trip;
}

async function selectTripOrNull(database: AppDatabase, id: string) {
  const [trip] = await database.select().from(trips).where(eq(trips.id, id)).limit(1);
  return trip ?? null;
}

async function selectDayEvent(database: AppDatabase, id: string) {
  const [dayEvent] = await database.select().from(tripDayEvents).where(eq(tripDayEvents.id, id)).limit(1);
  if (!dayEvent) {
    throw new Error('Day event was not created.');
  }

  return dayEvent;
}

async function selectDetailEvent(database: AppDatabase, id: string) {
  const [detailEvent] = await database.select().from(tripDetailEvents).where(eq(tripDetailEvents.id, id)).limit(1);
  if (!detailEvent) {
    throw new Error('Detail event was not created.');
  }

  return detailEvent;
}

async function selectDetailEventPhoto(database: AppDatabase, id: string) {
  const [photo] = await database.select().from(tripDetailEventPhotos).where(eq(tripDetailEventPhotos.id, id)).limit(1);
  if (!photo) {
    throw new Error('Detail event photo was not created.');
  }

  return photo;
}

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

function normalizeRequiredText(value: string, message: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(message);
  }

  return normalized;
}

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function createLocalId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
